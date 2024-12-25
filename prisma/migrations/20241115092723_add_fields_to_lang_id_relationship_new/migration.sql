/*
  Warnings:

  - The `lang_id` column on the `states` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "states" DROP COLUMN "lang_id",
ADD COLUMN     "lang_id" UUID;

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_lang_id_fkey" FOREIGN KEY ("lang_id") REFERENCES "lang_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
