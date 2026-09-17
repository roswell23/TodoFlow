require('dotenv').config()
const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/authRoutes')
const todoRoutes = require('./routes/todoRoutes')

const app = express()
const PORT = process.env.PORT || 4000

// Allow the Vite dev server (and any CLIENT_URL set in .env)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://usetodoflow.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean)

// Middleware
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin "${origin}" not allowed`))
  },
  credentials: true,
}))
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/todos', todoRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err)
  res.status(500).json({ message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
