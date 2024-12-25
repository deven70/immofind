-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "roles" "Role" NOT NULL,
    "full_name" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "fcm_token" TEXT,
    "mobile_number" TEXT NOT NULL,
    "password" TEXT,
    "email_address" TEXT NOT NULL,
    "address" TEXT,
    "image" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_address_key" ON "User"("email_address");
