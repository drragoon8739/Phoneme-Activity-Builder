-- CreateTable
CREATE TABLE "Phoneme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ipa" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "WordList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Word" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "english" TEXT NOT NULL,
    "hint" TEXT,
    "notes" TEXT,
    "wordListId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Word_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WordPhoneme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wordId" INTEGER NOT NULL,
    "phonemeId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "WordPhoneme_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WordPhoneme_phonemeId_fkey" FOREIGN KEY ("phonemeId") REFERENCES "Phoneme" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "wordListId" INTEGER NOT NULL,
    "attempts" INTEGER,
    "showHints" BOOLEAN NOT NULL DEFAULT true,
    "wordSelection" TEXT NOT NULL DEFAULT 'RANDOM',
    "targetWordId" INTEGER,
    "gridRows" INTEGER,
    "gridCols" INTEGER,
    "allowDiagonals" BOOLEAN NOT NULL DEFAULT true,
    "allowReverse" BOOLEAN NOT NULL DEFAULT false,
    "listMode" TEXT NOT NULL DEFAULT 'english',
    "maxWords" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_targetWordId_fkey" FOREIGN KEY ("targetWordId") REFERENCES "Word" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activityId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "selectedWord" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Generation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Phoneme_ipa_key" ON "Phoneme"("ipa");

-- CreateIndex
CREATE INDEX "Phoneme_group_idx" ON "Phoneme"("group");

-- CreateIndex
CREATE UNIQUE INDEX "WordList_name_key" ON "WordList"("name");

-- CreateIndex
CREATE INDEX "Word_wordListId_idx" ON "Word"("wordListId");

-- CreateIndex
CREATE UNIQUE INDEX "Word_wordListId_english_key" ON "Word"("wordListId", "english");

-- CreateIndex
CREATE INDEX "WordPhoneme_phonemeId_idx" ON "WordPhoneme"("phonemeId");

-- CreateIndex
CREATE UNIQUE INDEX "WordPhoneme_wordId_position_key" ON "WordPhoneme"("wordId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_name_key" ON "Activity"("name");

-- CreateIndex
CREATE INDEX "Activity_wordListId_idx" ON "Activity"("wordListId");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Generation_activityId_idx" ON "Generation"("activityId");
