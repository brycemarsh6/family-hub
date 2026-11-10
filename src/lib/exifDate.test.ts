import assert from "node:assert/strict";
import { test } from "node:test";

import { readExifTakenOn } from "./exifDate";

type Opts = {
  little?: boolean;
  original?: string; // DateTimeOriginal text, in the Exif sub-IFD
  plain?: string; // DateTime text, in IFD0
  exifOffsetDelta?: number; // added to the Exif sub-IFD pointer, to break it
  app1Header?: string; // "Exif" by default
};

/** Builds a tiny JPEG: SOI, one APP1 with a TIFF header, IFD0 and an Exif IFD. */
function buildJpeg(opts: Opts = {}): Uint8Array {
  const little = opts.little ?? true;
  const tiff: number[] = [];
  const u16 = (n: number) => (little ? [n & 255, n >> 8] : [n >> 8, n & 255]);
  const u32 = (n: number) =>
    little
      ? [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]
      : [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  const ascii = (s: string) => [...Array.from(s, (c) => c.charCodeAt(0)), 0];

  const entry = (tag: number, type: number, count: number, value: number) => [
    ...u16(tag),
    ...u16(type),
    ...u32(count),
    ...u32(value),
  ];

  const ifd0Entries = (opts.plain ? 1 : 0) + (opts.original !== undefined ? 1 : 0);
  const ifd0Size = 2 + ifd0Entries * 12 + 4;
  const ifd0At = 8;
  const exifIfdAt = ifd0At + ifd0Size;
  const exifIfdSize = opts.original !== undefined ? 2 + 12 + 4 : 0;
  let dataAt = exifIfdAt + exifIfdSize;

  const plainBytes = opts.plain ? ascii(opts.plain) : [];
  const plainAt = dataAt;
  dataAt += plainBytes.length;
  const originalBytes = opts.original !== undefined ? ascii(opts.original) : [];
  const originalAt = dataAt;

  tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(ifd0At));
  tiff.push(...u16(ifd0Entries));
  if (opts.plain) tiff.push(...entry(0x0132, 2, plainBytes.length, plainAt));
  if (opts.original !== undefined) {
    tiff.push(...entry(0x8769, 4, 1, exifIfdAt + (opts.exifOffsetDelta ?? 0)));
  }
  tiff.push(...u32(0));
  if (opts.original !== undefined) {
    tiff.push(...u16(1), ...entry(0x9003, 2, originalBytes.length, originalAt), ...u32(0));
  }
  tiff.push(...plainBytes, ...originalBytes);

  const header = Array.from(opts.app1Header ?? "Exif", (c) => c.charCodeAt(0));
  const body = [...header, 0, 0, ...tiff];
  const size = body.length + 2;
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, size >> 8, size & 255, ...body, 0xff, 0xd9]);
}

test("reads DateTimeOriginal, little-endian", () => {
  const jpeg = buildJpeg({ little: true, original: "2023:07:04 12:30:00" });
  assert.equal(readExifTakenOn(jpeg), "2023-07-04");
});

test("reads DateTimeOriginal, big-endian", () => {
  const jpeg = buildJpeg({ little: false, original: "2021:12:25 08:00:00" });
  assert.equal(readExifTakenOn(jpeg), "2021-12-25");
});

test("accepts an ArrayBuffer as well as a Uint8Array", () => {
  const jpeg = buildJpeg({ original: "2023:07:04 12:30:00" });
  assert.equal(readExifTakenOn(jpeg.buffer as ArrayBuffer), "2023-07-04");
});

test("prefers DateTimeOriginal over DateTime", () => {
  const jpeg = buildJpeg({ original: "2020:01:02 00:00:00", plain: "2024:05:06 00:00:00" });
  assert.equal(readExifTakenOn(jpeg), "2020-01-02");
});

test("falls back to IFD0 DateTime when there is no Exif sub-IFD", () => {
  assert.equal(readExifTakenOn(buildJpeg({ plain: "2019:09:09 09:09:09" })), "2019-09-09");
  assert.equal(
    readExifTakenOn(buildJpeg({ little: false, plain: "2018:03:04 05:06:07" })),
    "2018-03-04",
  );
});

test("falls back to DateTime when DateTimeOriginal is a zero date", () => {
  const jpeg = buildJpeg({ original: "0000:00:00 00:00:00", plain: "2022:02:02 02:02:02" });
  assert.equal(readExifTakenOn(jpeg), "2022-02-02");
});

test("a zero date alone is null", () => {
  assert.equal(readExifTakenOn(buildJpeg({ original: "0000:00:00 00:00:00" })), null);
  assert.equal(readExifTakenOn(buildJpeg({ plain: "0000:00:00 00:00:00" })), null);
});

test("an impossible date is null", () => {
  assert.equal(readExifTakenOn(buildJpeg({ original: "2023:02:30 00:00:00" })), null);
});

test("a JPEG with no APP1 is null", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xd9]);
  assert.equal(readExifTakenOn(jpeg), null);
});

test("an APP1 that is not Exif (XMP) is null", () => {
  const jpeg = buildJpeg({ original: "2023:07:04 12:30:00", app1Header: "http" });
  assert.equal(readExifTakenOn(jpeg), null);
});

test("not a JPEG, empty and tiny inputs are null", () => {
  assert.equal(readExifTakenOn(new Uint8Array(0)), null);
  assert.equal(readExifTakenOn(new Uint8Array(3)), null);
  assert.equal(readExifTakenOn(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])), null);
});

test("every truncation point returns null or the date, never throws", () => {
  const jpeg = buildJpeg({ original: "2023:07:04 12:30:00", plain: "2024:01:01 00:00:00" });
  for (let cut = 0; cut < jpeg.length; cut += 1) {
    const result = readExifTakenOn(jpeg.slice(0, cut));
    assert.ok(result === null || /^\d{4}-\d{2}-\d{2}$/.test(result), `cut at ${cut}`);
  }
});

test("truncation inside the date text is null", () => {
  const jpeg = buildJpeg({ original: "2023:07:04 12:30:00" });
  // The text is the last thing in the TIFF block, just before EOI.
  assert.equal(readExifTakenOn(jpeg.slice(0, jpeg.length - 14)), null);
});

test("an Exif IFD pointer past the end is null", () => {
  const jpeg = buildJpeg({ original: "2023:07:04 12:30:00", exifOffsetDelta: 100000 });
  assert.equal(readExifTakenOn(jpeg), null);
});

test("an Exif IFD pointer past the end still falls back to DateTime", () => {
  const jpeg = buildJpeg({
    original: "2023:07:04 12:30:00",
    plain: "2017:08:09 00:00:00",
    exifOffsetDelta: 100000,
  });
  assert.equal(readExifTakenOn(jpeg), "2017-08-09");
});

test("a wrong byte-order mark is null", () => {
  const jpeg = buildJpeg({ original: "2023:07:04 12:30:00" });
  const at = jpeg.indexOf(0x49);
  const broken = jpeg.slice();
  broken[at] = 0x00;
  broken[at + 1] = 0x00;
  assert.equal(readExifTakenOn(broken), null);
});
