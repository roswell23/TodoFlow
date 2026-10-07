const bcrypt = require('bcrypt')
const { prisma } = require('../src/db')

async function main() {
  console.log('Seeding dummy admin account...')

  const adminEmail = 'cryefionacruz@gmail.com'
  const adminPasswordPlain = 'roswellcruz23'
  const adminName = 'Roswell Cruz'

  const hashedPassword = await bcrypt.hash(adminPasswordPlain, 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  console.log('✔ Admin account seeded successfully:', {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
  })
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
