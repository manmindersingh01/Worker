-- Make Message.chatSessionId optional so a Message can belong to only a PdfChatSession
ALTER TABLE "Message" ALTER COLUMN "chatSessionId" DROP NOT NULL;
