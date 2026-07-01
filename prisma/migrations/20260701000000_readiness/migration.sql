-- CreateEnum
CREATE TYPE "ReadinessRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReadinessItemStatus" AS ENUM ('PRESENT', 'PARTIAL', 'MISSING', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "ReadinessRun" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "blueprintVersion" TEXT NOT NULL,
    "status" "ReadinessRunStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "maxWeight" INTEGER,
    "earnedWeight" DOUBLE PRECISION,
    "headline" TEXT,
    "topFixes" JSONB,
    "categoryScores" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReadinessRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessItemResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ReadinessItemStatus" NOT NULL,
    "weight" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "recommendation" TEXT,
    "citations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessItemResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "node" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadinessRun_sessionId_idx" ON "ReadinessRun"("sessionId");

-- CreateIndex
CREATE INDEX "ReadinessRun_userId_idx" ON "ReadinessRun"("userId");

-- CreateIndex
CREATE INDEX "ReadinessItemResult_runId_idx" ON "ReadinessItemResult"("runId");

-- CreateIndex
CREATE INDEX "ReadinessEvent_runId_idx" ON "ReadinessEvent"("runId");

-- AddForeignKey
ALTER TABLE "ReadinessRun" ADD CONSTRAINT "ReadinessRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PdfChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessItemResult" ADD CONSTRAINT "ReadinessItemResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReadinessRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessEvent" ADD CONSTRAINT "ReadinessEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReadinessRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
