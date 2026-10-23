const { prisma } = require('../src/db')

async function main() {
  console.log('Ensuring Role enum and User columns exist...')
  
  // 1. Create Role enum if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN 
        CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN'); 
      END IF; 
    END $$;
  `)
  console.log('✔ Enum "Role" verified.')

  // 2. Add role column to users table if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "users" 
    ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'USER';
  `)
  console.log('✔ Column "users.role" verified.')

  // 3. Add isActive column to users table if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "users" 
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
  `)
  console.log('✔ Column "users.isActive" verified.')

  // 4. Create subtasks table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "subtasks" (
      "id" TEXT NOT NULL,
      "todoId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "completed" BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "subtasks_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "todos"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "subtasks_todoId_idx" ON "subtasks"("todoId");
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "subtasks_todoId_order_idx" ON "subtasks"("todoId", "order");
  `)
  console.log('✔ Table "subtasks" and indexes verified.')

  // 5. Add isEmailVerified column to users table if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "users" 
    ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;
  `)
  console.log('✔ Column "users.isEmailVerified" verified.')

  // 6. Ensure verification_codes table has email column & index
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "verification_codes" 
    ADD COLUMN IF NOT EXISTS "email" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "verification_codes_email_idx" ON "verification_codes"("email");
  `)
  console.log('✔ Table "verification_codes" email column and index verified.')

  console.log('All database migrations applied safely without data loss!')
}

main()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
