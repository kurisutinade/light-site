/*
  Warnings:

  - You are about to drop the `Chat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatId_fkey";

-- DropTable
DROP TABLE "Chat";

-- DropTable
DROP TABLE "Message";

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chat_id" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_updated_at_idx" ON "chats"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "chat_created_at_idx" ON "chats"("created_at");

-- CreateIndex
CREATE INDEX "message_chat_id_created_at_idx" ON "messages"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "message_created_at_idx" ON "messages"("created_at");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
