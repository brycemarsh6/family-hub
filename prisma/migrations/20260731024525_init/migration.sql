-- CreateTable
CREATE TABLE "GroceryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "addedBy" TEXT,
    "note" TEXT,
    "pantryItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedAt" DATETIME,
    CONSTRAINT "GroceryItem_pantryItemId_fkey" FOREIGN KEY ("pantryItemId") REFERENCES "PantryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Pantry',
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "lowThreshold" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "GroceryItem_pantryItemId_idx" ON "GroceryItem"("pantryItemId");

-- CreateIndex
CREATE INDEX "PantryItem_location_idx" ON "PantryItem"("location");
