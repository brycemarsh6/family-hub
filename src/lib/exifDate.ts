import { isTakenOn } from "@/lib/slideshowPhotos";

// Reads the date a photo was taken out of a JPEG's EXIF block, with no
// dependency: only one tag is needed. The result is a plain "YYYY-MM-DD"
// string, not a moment in time, because a camera's clock has no timezone.
// Pure and never throws: anything truncated, odd or out of range is null.
// Safari hands a file input JPEG (it converts HEIC itself), so JPEG covers
// the family's phones.

const TAG_DATE_TIME = 0x0132;
const TAG_EXIF_POINTER = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TYPE_ASCII = 2;

export function readExifTakenOn(bytes: ArrayBuffer | Uint8Array): string | null {
  try {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const tiff = findTiffStart(view);
    if (tiff === null) return null;
    return readDate(view, tiff);
  } catch {
    return null;
  }
}

/** Walks the JPEG markers to the APP1 "Exif\0\0" block; returns where its TIFF header starts. */
function findTiffStart(view: DataView): number | null {
  const length = view.byteLength;
  if (length < 4 || view.getUint16(0) !== 0xffd8) return null;
  let pos = 2;
  while (pos + 4 <= length) {
    if (view.getUint8(pos) !== 0xff) return null;
    const marker = view.getUint8(pos + 1);
    if (marker === 0xff) {
      pos += 1; // fill byte
      continue;
    }
    // Start of scan or end of image: no metadata after this point.
    if (marker === 0xda || marker === 0xd9) return null;
    const size = view.getUint16(pos + 2);
    if (size < 2) return null;
    if (marker === 0xe1) {
      const start = pos + 4;
      if (
        start + 6 <= length &&
        view.getUint32(start) === 0x45786966 && // "Exif"
        view.getUint16(start + 4) === 0
      ) {
        return start + 6;
      }
    }
    pos += 2 + size;
  }
  return null;
}

function readDate(view: DataView, tiff: number): string | null {
  if (tiff + 8 > view.byteLength) return null;
  const order = view.getUint16(tiff);
  const little = order === 0x4949;
  if (!little && order !== 0x4d4d) return null;
  if (view.getUint16(tiff + 2, little) !== 42) return null;

  const ifd0 = tiff + view.getUint32(tiff + 4, little);
  const exifPointer = findEntry(view, tiff, ifd0, TAG_EXIF_POINTER, little);
  if (exifPointer !== null) {
    const exifIfd = tiff + view.getUint32(exifPointer.valueAt, little);
    const original = findEntry(view, tiff, exifIfd, TAG_DATE_TIME_ORIGINAL, little);
    const date = original && readAscii(view, tiff, original, little);
    if (date) return date;
  }
  const plain = findEntry(view, tiff, ifd0, TAG_DATE_TIME, little);
  return plain ? readAscii(view, tiff, plain, little) : null;
}

type Entry = { type: number; count: number; valueAt: number };

/** Looks one tag up in an IFD. Returns where its 4-byte value field sits. */
function findEntry(
  view: DataView,
  tiff: number,
  ifd: number,
  tag: number,
  little: boolean,
): Entry | null {
  if (ifd < tiff || ifd + 2 > view.byteLength) return null;
  const entries = view.getUint16(ifd, little);
  for (let i = 0; i < entries; i += 1) {
    const at = ifd + 2 + i * 12;
    if (at + 12 > view.byteLength) return null;
    if (view.getUint16(at, little) === tag) {
      return {
        type: view.getUint16(at + 2, little),
        count: view.getUint32(at + 4, little),
        valueAt: at + 8,
      };
    }
  }
  return null;
}

/** Reads "YYYY:MM:DD HH:MM:SS" and returns "YYYY-MM-DD" if it is a real date. */
function readAscii(view: DataView, tiff: number, entry: Entry, little: boolean): string | null {
  if (entry.type !== TYPE_ASCII || entry.count < 10) return null;
  // Ten or more bytes never fit the 4-byte value field: it holds an offset.
  const start = tiff + view.getUint32(entry.valueAt, little);
  if (start < tiff || start + 10 > view.byteLength) return null;
  let text = "";
  for (let i = 0; i < 10; i += 1) text += String.fromCharCode(view.getUint8(start + i));
  const match = /^(\d{4}):(\d{2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  return isTakenOn(date) ? date : null;
}
