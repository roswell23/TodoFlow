const { PrismaClient } = require('@prisma/client')

// In Prisma 7, the Neon adapter is configured in prisma.config.ts.
// PrismaClient automatically uses it at runtime — no manual setup needed here.
const prisma = new PrismaClient()

module.exports = { prisma }
