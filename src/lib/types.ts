// Plain shapes for the data we hand from the server to the browser.
//
// We define these by hand rather than reusing Prisma's own types so that the
// browser-side code never imports anything from the database layer. It keeps
// the JavaScript sent to the phone small, and makes it obvious exactly which
// fields each screen actually needs.

export type GroceryItemView = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  checked: boolean;
  note: string | null;
  pantryItemId: string | null;
  /** Where this'll be bought. Null until the shopper chooses one. */
  store: string | null;
};

export type PantryItemView = {
  id: string;
  name: string;
  location: string;
  quantity: number;
  unit: string | null;
  category: string;
  lowThreshold: number;
  /** True when this item already has an unchecked entry on the grocery list. */
  onList: boolean;
  /**
   * A real expiry date someone read off the packet and typed in. Wins over
   * any estimate the Expiring page would otherwise guess — see
   * src/lib/shelfLife.ts for the estimate side of this.
   */
  expiresAt: Date | null;
};
