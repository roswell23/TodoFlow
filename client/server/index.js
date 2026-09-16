import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const app = express(); const prisma = new PrismaClient(); const PORT = process.env.PORT || 4000
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' })); app.use(express.json())
const safeUser = ({ id, name, email, createdAt }) => ({ id, name, email, createdAt })
const responseError = (res, status, message) => res.status(status).json({ success: false, message })
const tokenFor = user => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

function requireAuth(req, res, next) { const header = req.headers.authorization; if (!header?.startsWith('Bearer ')) return responseError(res, 401, 'Authentication required.'); try { const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET); req.userId = payload.sub; next() } catch { return responseError(res, 401, 'Invalid or expired token.') } }

app.post('/api/auth/signup', async (req, res) => { const { name, email, password, confirmPassword } = req.body || {}; if (!name?.trim()) return responseError(res, 400, 'Name is required.'); if (!validEmail(email || '')) return responseError(res, 400, 'Please enter a valid email address.'); if (!password || password.length < 8) return responseError(res, 400, 'Password must be at least 8 characters.'); if (password !== confirmPassword) return responseError(res, 400, 'Passwords do not match.'); const normalizedEmail = email.toLowerCase().trim(); try { const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } }); if (exists) return responseError(res, 409, 'An account with this email already exists.'); const user = await prisma.user.create({ data: { name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) } }); return res.status(201).json({ success: true, message: 'Account created.', user: safeUser(user), token: tokenFor(user) }) } catch (error) { if (error.code === 'P2002') return responseError(res, 409, 'An account with this email already exists.'); console.error(error); return responseError(res, 500, 'Unable to create account.') } })
app.post('/api/auth/login', async (req, res) => { const email = req.body?.email?.toLowerCase().trim(); const { password } = req.body || {}; if (!validEmail(email || '') || !password) return responseError(res, 400, 'Email and password are required.'); try { const user = await prisma.user.findUnique({ where: { email } }); if (!user || !(await bcrypt.compare(password, user.passwordHash))) return responseError(res, 401, 'Invalid email or password.'); return res.json({ success: true, message: 'Login successful.', user: safeUser(user), token: tokenFor(user) }) } catch (error) { console.error(error); return responseError(res, 500, 'Unable to log in.') } })
app.get('/api/auth/me', requireAuth, async (req, res) => { try { const user = await prisma.user.findUnique({ where: { id: req.userId } }); if (!user) return responseError(res, 401, 'User no longer exists.'); return res.json({ success: true, user: safeUser(user) }) } catch { return responseError(res, 401, 'Unable to authenticate user.') } })
app.post('/api/auth/logout', requireAuth, (_req, res) => res.json({ success: true, message: 'Logged out successfully.' }))
app.get('/api/health', (_req, res) => res.json({ success: true }))
app.listen(PORT, () => console.log(`TodoFlow API listening on port ${PORT}`))
