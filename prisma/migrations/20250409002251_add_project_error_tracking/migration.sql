-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "errorTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "frequency" TEXT NOT NULL DEFAULT 'weekly';
