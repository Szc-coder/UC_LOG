-- CreateTable
CREATE TABLE "StoolRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "bristolType" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "consistency" TEXT NOT NULL,
    "volume" TEXT,
    "bloodPresent" BOOLEAN NOT NULL DEFAULT false,
    "bloodAmount" TEXT,
    "bloodLocation" TEXT,
    "bloodColor" TEXT,
    "mucusPresent" BOOLEAN NOT NULL DEFAULT false,
    "mucusAmount" TEXT,
    "mucusColor" TEXT,
    "urgencyLevel" INTEGER,
    "urgencySudden" BOOLEAN,
    "painBeforePresent" BOOLEAN,
    "painBeforeLocation" TEXT,
    "painBeforeIntensity" INTEGER,
    "painAfterPresent" BOOLEAN,
    "painAfterLocation" TEXT,
    "painAfterIntensity" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyStoolSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "nighttimeCount" INTEGER NOT NULL DEFAULT 0,
    "b1Count" INTEGER NOT NULL DEFAULT 0,
    "b2Count" INTEGER NOT NULL DEFAULT 0,
    "b3Count" INTEGER NOT NULL DEFAULT 0,
    "b4Count" INTEGER NOT NULL DEFAULT 0,
    "b5Count" INTEGER NOT NULL DEFAULT 0,
    "b6Count" INTEGER NOT NULL DEFAULT 0,
    "b7Count" INTEGER NOT NULL DEFAULT 0,
    "bloodOccurrences" INTEGER NOT NULL DEFAULT 0,
    "maxBloodAmount" TEXT,
    "mucusOccurrences" INTEGER NOT NULL DEFAULT 0,
    "urgencyAvg" REAL,
    "painEpisodes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "apiBaseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyStoolSummary_date_key" ON "DailyStoolSummary"("date");
