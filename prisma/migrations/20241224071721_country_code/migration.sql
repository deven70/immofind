/*
  Warnings:

  - The values [AGENCIES,PROMOTEURS] on the enum `agency_type` will be removed. If these variants are still used in the database, this will fail.
  - The `name` column on the `agency_packages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `en_name` on the `cities` table. All the data in the column will be lost.
  - You are about to drop the column `fr_name` on the `cities` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `cities` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `cities` table. All the data in the column will be lost.
  - You are about to drop the column `en_name` on the `districts` table. All the data in the column will be lost.
  - You are about to drop the column `fr_name` on the `districts` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `districts` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `districts` table. All the data in the column will be lost.
  - The `link_uuid` column on the `property_details` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `picture` column on the `property_details` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `key` on the `property_meta_details` table. All the data in the column will be lost.
  - You are about to drop the column `property_cat` on the `property_type_listings` table. All the data in the column will be lost.
  - You are about to drop the column `property_option` on the `property_type_listings` table. All the data in the column will be lost.
  - The `title` column on the `property_types` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `en_name` on the `states` table. All the data in the column will be lost.
  - You are about to drop the column `fr_name` on the `states` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `states` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `states` table. All the data in the column will be lost.
  - The `mobile_number` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[lang_id]` on the table `states` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `transaction` to the `property_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `property_details` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `title` on the `property_details` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `description` on the `property_details` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `property_type_id` to the `property_meta_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `property_type_listings` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `name` on the `property_type_listings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "agency_type_new" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');
ALTER TABLE "agency_packages" ALTER COLUMN "type" TYPE "agency_type_new" USING ("type"::text::"agency_type_new");
ALTER TYPE "agency_type" RENAME TO "agency_type_old";
ALTER TYPE "agency_type_new" RENAME TO "agency_type";
DROP TYPE "agency_type_old";
COMMIT;

-- DropIndex
DROP INDEX "agency_packages_name_key";

-- DropIndex
DROP INDEX "cities_name_key";

-- DropIndex
DROP INDEX "cities_slug_key";

-- DropIndex
DROP INDEX "districts_name_key";

-- DropIndex
DROP INDEX "districts_slug_key";

-- DropIndex
DROP INDEX "property_meta_details_key_key";

-- DropIndex
DROP INDEX "property_types_title_key";

-- DropIndex
DROP INDEX "states_name_key";

-- DropIndex
DROP INDEX "states_slug_key";

-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "publishing_status_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sub_user_id" UUID;

-- AlterTable
ALTER TABLE "agency_packages" DROP COLUMN "name",
ADD COLUMN     "name" UUID;

-- AlterTable
ALTER TABLE "cities" DROP COLUMN "en_name",
DROP COLUMN "fr_name",
DROP COLUMN "name",
DROP COLUMN "slug",
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "districts" DROP COLUMN "en_name",
DROP COLUMN "fr_name",
DROP COLUMN "name",
DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "property_details" ADD COLUMN     "project_id" UUID,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "transaction" VARCHAR NOT NULL,
ADD COLUMN     "type" UUID NOT NULL,
DROP COLUMN "title",
ADD COLUMN     "title" UUID NOT NULL,
DROP COLUMN "link_uuid",
ADD COLUMN     "link_uuid" UUID,
DROP COLUMN "description",
ADD COLUMN     "description" UUID NOT NULL,
ALTER COLUMN "state_id" DROP NOT NULL,
ALTER COLUMN "city_id" DROP NOT NULL,
DROP COLUMN "picture",
ADD COLUMN     "picture" TEXT[];

-- AlterTable
ALTER TABLE "property_meta_details" DROP COLUMN "key",
ADD COLUMN     "property_type_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "property_type_listings" DROP COLUMN "property_cat",
DROP COLUMN "property_option",
ADD COLUMN     "category" BIGINT NOT NULL,
ADD COLUMN     "key" VARCHAR,
ADD COLUMN     "type" VARCHAR,
DROP COLUMN "name",
ADD COLUMN     "name" UUID NOT NULL;

-- AlterTable
ALTER TABLE "property_types" DROP COLUMN "title",
ADD COLUMN     "title" UUID;

-- AlterTable
ALTER TABLE "states" DROP COLUMN "en_name",
DROP COLUMN "fr_name",
DROP COLUMN "name",
DROP COLUMN "slug",
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country_code" VARCHAR,
ADD COLUMN     "email_password_code" INTEGER,
ADD COLUMN     "phone_password_code" INTEGER,
ADD COLUMN     "social_id" VARCHAR,
ALTER COLUMN "full_name" DROP NOT NULL,
ALTER COLUMN "user_name" DROP NOT NULL,
DROP COLUMN "mobile_number",
ADD COLUMN     "mobile_number" BIGINT,
ALTER COLUMN "email_address" DROP NOT NULL;

-- CreateTable
CREATE TABLE "neighborhoods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "district_id" UUID NOT NULL,
    "lang_id" UUID,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "link_uuid" VARCHAR NOT NULL,
    "price" INTEGER,
    "state_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "district_id" UUID NOT NULL,
    "latitude" VARCHAR NOT NULL,
    "longitude" VARCHAR NOT NULL,
    "vr_link" VARCHAR,
    "picture" VARCHAR,
    "video" VARCHAR,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "title" UUID NOT NULL,
    "description" UUID NOT NULL,

    CONSTRAINT "project_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_meta_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_detail_id" UUID NOT NULL,
    "value" VARCHAR NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "project_type_listing_id" UUID NOT NULL,

    CONSTRAINT "project_meta_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_type_listings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "icon" VARCHAR,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "name" UUID NOT NULL,
    "type" VARCHAR,
    "key" VARCHAR,
    "category" BIGINT NOT NULL,

    CONSTRAINT "project_type_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT,
    "email" VARCHAR,
    "phone" VARCHAR,
    "address" TEXT,
    "password" TEXT,
    "description" TEXT,
    "facebookLink" VARCHAR,
    "twitterLink" VARCHAR,
    "youtubeLink" VARCHAR,
    "pinterestLink" VARCHAR,
    "linkedinLink" VARCHAR,
    "instagramLink" VARCHAR,
    "whatsappPhone" VARCHAR,
    "serviceArea" VARCHAR,
    "taxNumber" VARCHAR,
    "licenseNumber" VARCHAR,
    "publishingStatusId" BIGINT DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "agency_package_id" TEXT,
    "credit" VARCHAR,

    CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DevelopersToAgencyPackages" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "developers_user_id_key" ON "developers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "_DevelopersToAgencyPackages_AB_unique" ON "_DevelopersToAgencyPackages"("A", "B");

-- CreateIndex
CREATE INDEX "_DevelopersToAgencyPackages_B_index" ON "_DevelopersToAgencyPackages"("B");

-- CreateIndex
CREATE UNIQUE INDEX "states_lang_id_key" ON "states"("lang_id");

-- AddForeignKey
ALTER TABLE "agency_packages" ADD CONSTRAINT "agency_packages_name_fkey" FOREIGN KEY ("name") REFERENCES "lang_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhoods" ADD CONSTRAINT "district_foreign_key" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_lang_id_fkey" FOREIGN KEY ("lang_id") REFERENCES "lang_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_details" ADD CONSTRAINT "project_id_foreign_key" FOREIGN KEY ("project_id") REFERENCES "project_details"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_details" ADD CONSTRAINT "property_descriptioj_foreign_key" FOREIGN KEY ("description") REFERENCES "lang_translations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_details" ADD CONSTRAINT "property_title_foreign_key" FOREIGN KEY ("title") REFERENCES "lang_translations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_details" ADD CONSTRAINT "property_type_foreign_key" FOREIGN KEY ("type") REFERENCES "property_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_details" ADD CONSTRAINT "property_user_foreign_key" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_details" ADD CONSTRAINT "city_project_foreign_key" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_details" ADD CONSTRAINT "districts_project_foreign_key" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_details" ADD CONSTRAINT "project_details_description_fkey" FOREIGN KEY ("description") REFERENCES "lang_translations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_details" ADD CONSTRAINT "project_details_title_fkey" FOREIGN KEY ("title") REFERENCES "lang_translations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_details" ADD CONSTRAINT "project_user_foreign_key" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_details" ADD CONSTRAINT "state_project_foreign_key" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_meta_details" ADD CONSTRAINT "project_meta_details_project_detail_id_fkey" FOREIGN KEY ("project_detail_id") REFERENCES "project_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_meta_details" ADD CONSTRAINT "project_meta_details_project_type_listing_id_fkey" FOREIGN KEY ("project_type_listing_id") REFERENCES "project_type_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_type_listings" ADD CONSTRAINT "project_listing_name_foreign_key" FOREIGN KEY ("name") REFERENCES "lang_translations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_meta_details" ADD CONSTRAINT "property_detail_foreign_key" FOREIGN KEY ("property_detail_id") REFERENCES "property_details"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_meta_details" ADD CONSTRAINT "property_type_foreign_key" FOREIGN KEY ("property_type_id") REFERENCES "property_type_listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_type_listings" ADD CONSTRAINT "property_listing_name_foreign_key" FOREIGN KEY ("name") REFERENCES "lang_translations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_types" ADD CONSTRAINT "property_type_foreign_key" FOREIGN KEY ("title") REFERENCES "lang_translations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_DevelopersToAgencyPackages" ADD CONSTRAINT "_DevelopersToAgencyPackages_A_fkey" FOREIGN KEY ("A") REFERENCES "agency_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DevelopersToAgencyPackages" ADD CONSTRAINT "_DevelopersToAgencyPackages_B_fkey" FOREIGN KEY ("B") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
