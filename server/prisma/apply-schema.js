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
