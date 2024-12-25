/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `districts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "districts" ADD COLUMN     "en_name" VARCHAR,
ADD COLUMN     "fr_name" VARCHAR,
ADD COLUMN     "lang_id" UUID,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "slug" VARCHAR;

-- CreateIndex
CREATE UNIQUE INDEX "districts_slug_key" ON "districts"("slug");

-- RenameForeignKey
ALTER TABLE "districts" RENAME CONSTRAINT "citiy_foreign_key" TO "city_foreign_key";

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_lang_id_fkey" FOREIGN KEY ("lang_id") REFERENCES "lang_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
