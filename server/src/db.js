const { PrismaClient } = require('@prisma/client')
const { Pool, neonConfig } = require('@neondatabase/serverless')
const { PrismaNeon } = require('@prisma/adapter-neon')
const ws = require('ws')
require('dotenv').config()

// Enable WebSocket support for Neon serverless in Node.js
neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaNeon(pool)

const prisma = new PrismaClient({ adapter })

module.exports = { prisma }
