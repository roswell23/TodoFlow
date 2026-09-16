const { PrismaClient } = require('@prisma/client')
const { neonConfig } = require('@neondatabase/serverless')
const { PrismaNeon } = require('@prisma/adapter-neon')
const ws = require('ws')
require('dotenv').config()

// Enable WebSocket support for Neon serverless in Node.js
neonConfig.webSocketConstructor = ws

// In Prisma 7, PrismaNeon accepts the pool config object directly
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

module.exports = { prisma }
