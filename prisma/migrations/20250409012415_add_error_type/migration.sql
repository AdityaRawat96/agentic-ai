/*
  Warnings:

  - Added the required column `type` to the `Error` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Error" ADD COLUMN     "type" TEXT NOT NULL;
