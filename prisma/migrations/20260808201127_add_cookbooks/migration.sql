-- CreateTable
CREATE TABLE "Cookbook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cookbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookbookRecipe" (
    "id" TEXT NOT NULL,
    "cookbookId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CookbookRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cookbook_shareToken_key" ON "Cookbook"("shareToken");

-- CreateIndex
CREATE INDEX "CookbookRecipe_recipeId_idx" ON "CookbookRecipe"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "CookbookRecipe_cookbookId_recipeId_key" ON "CookbookRecipe"("cookbookId", "recipeId");

-- AddForeignKey
ALTER TABLE "CookbookRecipe" ADD CONSTRAINT "CookbookRecipe_cookbookId_fkey" FOREIGN KEY ("cookbookId") REFERENCES "Cookbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookbookRecipe" ADD CONSTRAINT "CookbookRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
