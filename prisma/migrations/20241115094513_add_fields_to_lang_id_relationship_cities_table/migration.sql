/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `cities` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "en_name" VARCHAR,
ADD COLUMN     "fr_name" VARCHAR,
ADD COLUMN     "lang_id" UUID,
ADD COLUMN     "slug" VARCHAR;

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_lang_id_fkey" FOREIGN KEY ("lang_id") REFERENCES "lang_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
