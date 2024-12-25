-- AlterTable
ALTER TABLE "property_details" ADD COLUMN     "currency_id" UUID;

-- CreateTable
CREATE TABLE "currency" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "symbol" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currency_symbol_key" ON "currency"("symbol");

-- AddForeignKey
ALTER TABLE "property_details" ADD CONSTRAINT "property_details_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
