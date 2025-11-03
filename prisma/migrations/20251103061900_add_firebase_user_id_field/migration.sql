-- Add firebaseUserId column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='User' AND column_name='firebaseUserId') THEN
    ALTER TABLE "User" ADD COLUMN "firebaseUserId" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "User_firebaseUserId_key" ON "User"("firebaseUserId");
  END IF;
END $$;

-- Add appleId column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='User' AND column_name='appleId') THEN
    ALTER TABLE "User" ADD COLUMN "appleId" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "User_appleId_key" ON "User"("appleId");
  END IF;
END $$;