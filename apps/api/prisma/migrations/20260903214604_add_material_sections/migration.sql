-- AlterTable
ALTER TABLE "GroupMaterial" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "MaterialSection" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialSection_groupId_idx" ON "MaterialSection"("groupId");

-- CreateIndex
CREATE INDEX "GroupMaterial_sectionId_idx" ON "GroupMaterial"("sectionId");

-- AddForeignKey
ALTER TABLE "MaterialSection" ADD CONSTRAINT "MaterialSection_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMaterial" ADD CONSTRAINT "GroupMaterial_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "MaterialSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
