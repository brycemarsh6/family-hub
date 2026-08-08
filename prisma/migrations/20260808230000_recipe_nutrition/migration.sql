-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "nutritionCalories" INTEGER,
ADD COLUMN     "nutritionCarbsG" INTEGER,
ADD COLUMN     "nutritionFatG" INTEGER,
ADD COLUMN     "nutritionFingerprint" TEXT,
ADD COLUMN     "nutritionProteinG" INTEGER,
ADD COLUMN     "nutritionServings" INTEGER;
