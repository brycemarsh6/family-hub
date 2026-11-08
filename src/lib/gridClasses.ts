// Class strings that a component and its loading skeleton must share, written
// once (Captain's A-L2-3). Plain constants (no React) so a server `loading.tsx`
// can import them. They stay full literal strings because Tailwind finds
// class names by scanning source text.

/** The Calendar's Year grid: 2 across, 3 from a 40rem container, 4 from 60rem (mission-46). */
export const YEAR_GRID_CLASSES = "grid grid-cols-2 gap-3 @min-[40rem]:grid-cols-3 @min-[60rem]:grid-cols-4";
