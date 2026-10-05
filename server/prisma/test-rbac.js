const http = require('http')

async function runTests() {
  console.log('🧪 Starting Backend RBAC Security & API Tests...\n')
  
  // Start server locally for tests
  require('dotenv').config()
  const express = require('express')
  const authRoutes = require('../src/routes/authRoutes')
  const todoRoutes = require('../src/routes/todoRoutes')
  const adminRoutes = require('../src/routes/adminRoutes')

  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  app.use('/api/todos', todoRoutes)
  app.use('/api/admin', adminRoutes)

  const server = app.listen(4001)

  const request = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null
      const req = http.request({
        hostname: 'localhost',
        port: 4001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          let parsed = {}
          try { parsed = JSON.parse(data) } catch (e) { parsed = { raw: data } }
          resolve({ status: res.statusCode, body: parsed })
        })
      })
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
  }

  try {
    // 1. Test Admin Login
    console.log('1. Testing Admin Login with dummy admin credentials...')
    const adminLoginRes = await request('/api/auth/login', 'POST', {
      email: 'admin@todoflow.test',
      password: 'Admin@12345',
    })
    if (adminLoginRes.status !== 200 || adminLoginRes.body.user?.role !== 'ADMIN') {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.body)}`)
    }
    const adminToken = adminLoginRes.body.token
    console.log('✔ Admin login success. Role is ADMIN.')

    // 2. Test Admin Access to /api/admin/stats
    console.log('2. Testing Admin Access to /api/admin/stats...')
    const statsRes = await request('/api/admin/stats', 'GET', null, adminToken)
    if (statsRes.status !== 200 || typeof statsRes.body.totalUsers !== 'number') {
      throw new Error(`Admin stats failed: ${JSON.stringify(statsRes.body)}`)
    }
    console.log('✔ Admin stats returned successfully:', statsRes.body)

    // 3. Test Admin Access to /api/admin/users
    console.log('3. Testing Admin Access to /api/admin/users...')
    const usersRes = await request('/api/admin/users', 'GET', null, adminToken)
    if (usersRes.status !== 200 || !Array.isArray(usersRes.body.users)) {
      throw new Error(`Admin users failed: ${JSON.stringify(usersRes.body)}`)
    }
    // Verify password is not exposed
    const hasPasswordExposed = usersRes.body.users.some(u => u.password || u.passwordHash)
    if (hasPasswordExposed) {
      throw new Error('SECURITY BREACH: Password hash exposed in admin users list!')
    }
    console.log(`✔ Admin retrieved ${usersRes.body.users.length} users safely without exposing passwords.`)

    // 4. Test Normal User Registration Attempting Role Escalation
    console.log('4. Testing Normal User registration with attempted role escalation (role: "ADMIN")...')
    const testUserEmail = `testuser_${Date.now()}@todoflow.test`
    const signupRes = await request('/api/auth/signup', 'POST', {
      name: 'Regular Test User',
      email: testUserEmail,
      password: 'Password@123',
      role: 'ADMIN', // Malicious attempt to escalate role
    })
    if (signupRes.status !== 201) {
      throw new Error(`Signup failed: ${JSON.stringify(signupRes.body)}`)
    }
    if (signupRes.body.user.role !== 'USER') {
      throw new Error(`SECURITY FAILURE: User registered as ${signupRes.body.user.role} instead of USER!`)
    }
    const userToken = signupRes.body.token
    console.log('✔ User registered successfully with role strictly enforced as USER.')

    // 5. Test Normal User Forbidden from Admin Routes (RBAC Enforcement)
    console.log('5. Testing Normal User access to /api/admin/stats (Expect 403 Forbidden)...')
    const forbiddenStatsRes = await request('/api/admin/stats', 'GET', null, userToken)
    if (forbiddenStatsRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, but got ${forbiddenStatsRes.status}`)
    }
    console.log('✔ 403 Forbidden correctly returned for normal user accessing /api/admin/stats.')

    console.log('6. Testing Normal User access to /api/admin/users (Expect 403 Forbidden)...')
    const forbiddenUsersRes = await request('/api/admin/users', 'GET', null, userToken)
    if (forbiddenUsersRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, but got ${forbiddenUsersRes.status}`)
    }
    console.log('✔ 403 Forbidden correctly returned for normal user accessing /api/admin/users.')

    // 6. Test Unauthenticated Access (Expect 401 Unauthorized)
    console.log('7. Testing Unauthenticated access to /api/admin/stats (Expect 401 Unauthorized)...')
    const unauthRes = await request('/api/admin/stats', 'GET', null, null)
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, but got ${unauthRes.status}`)
    }
    console.log('✔ 401 Unauthorized correctly returned for unauthenticated request.')

    // 7. Test User Creating a Todo and Admin Reading It
    console.log('8. Testing user task creation and admin global visibility...')
    const createTodoRes = await request('/api/todos', 'POST', {
      title: 'RBAC Test Task',
      description: 'Testing task isolation and admin moderation',
      priority: 'high',
      category: 'testing',
    }, userToken)
    if (createTodoRes.status !== 201) {
      throw new Error(`Todo creation failed: ${JSON.stringify(createTodoRes.body)}`)
    }
    const createdTodoId = createTodoRes.body.todo.id

    // Admin should see this todo with user author details
    const adminTodosRes = await request('/api/admin/todos', 'GET', null, adminToken)
    if (adminTodosRes.status !== 200) {
      throw new Error(`Admin get todos failed: ${JSON.stringify(adminTodosRes.body)}`)
    }
    const foundInAdmin = adminTodosRes.body.todos.find(t => t.id === createdTodoId)
    if (!foundInAdmin || !foundInAdmin.user?.email) {
      throw new Error('Admin could not view the created task or task owner info was missing!')
    }
    console.log('✔ Admin can see task with user owner information:', {
      todoId: foundInAdmin.id,
      title: foundInAdmin.title,
      owner: foundInAdmin.user.email,
    })

    // Admin can delete task
    console.log('9. Testing Admin ability to delete task...')
    const adminDeleteTodoRes = await request(`/api/admin/todos/${createdTodoId}`, 'DELETE', null, adminToken)
    if (adminDeleteTodoRes.status !== 200) {
      throw new Error(`Admin delete todo failed: ${JSON.stringify(adminDeleteTodoRes.body)}`)
    }
    console.log('✔ Admin deleted task successfully.')

    // Clean up created test user
    const { prisma } = require('../src/db')
    await prisma.user.delete({ where: { email: testUserEmail } })
    console.log('✔ Test user cleaned up.')

    console.log('\n🎉 ALL BACKEND RBAC & SECURITY TESTS PASSED PERFECTLY!\n')
  } finally {
    server.close()
  }
}

runTests()
  .catch((err) => {
    console.error('❌ RBAC Test Failed:', err)
    process.exit(1)
  })
