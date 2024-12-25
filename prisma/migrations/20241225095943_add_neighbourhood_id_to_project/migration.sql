-- AlterTable
ALTER TABLE "project_details" ADD COLUMN     "neighborhoods_id" UUID;

-- AddForeignKey
ALTER TABLE "project_details" ADD CONSTRAINT "project_details_neighborhoods_id_fkey" FOREIGN KEY ("neighborhoods_id") REFERENCES "neighborhoods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
