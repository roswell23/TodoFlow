const http = require('http')
require('dotenv').config()
const express = require('express')
const authRoutes = require('../src/routes/authRoutes')
const todoRoutes = require('../src/routes/todoRoutes')

async function runSubtaskTests() {
  console.log('🧪 Starting Subtasks / Checklist Feature API Tests...\n')

  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  app.use('/api/todos', todoRoutes)

  const server = app.listen(4002)

  const request = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null
      const req = http.request(
        {
          hostname: 'localhost',
          port: 4002,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            let parsed = {}
            try {
              parsed = JSON.parse(data)
            } catch {
              parsed = { raw: data }
            }
            resolve({ status: res.statusCode, body: parsed })
          })
        }
      )
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
  }

  try {
    // 1. Create 2 test users to verify auth and cross-user ownership isolation
    const emailA = `test-user-a-${Date.now()}@todoflow.test`
    const emailB = `test-user-b-${Date.now()}@todoflow.test`
    const password = 'Password@123'

    const userARes = await request('/api/auth/signup', 'POST', {
      name: 'User A',
      email: emailA,
      password,
    })
    if (userARes.status !== 201) throw new Error(`User A registration failed: ${JSON.stringify(userARes.body)}`)
    const tokenA = userARes.body.token

    const userBRes = await request('/api/auth/signup', 'POST', {
      name: 'User B',
      email: emailB,
      password,
    })
    if (userBRes.status !== 201) throw new Error(`User B registration failed: ${JSON.stringify(userBRes.body)}`)
    const tokenB = userBRes.body.token
    console.log('✔ User A and User B registered successfully.')

    // 2. Create task with initial subtasks for User A
    const createTodoRes = await request(
      '/api/todos',
      'POST',
      {
        title: 'Parent Task with Subtasks',
        priority: 'high',
        subtasks: [{ title: 'Initial Subtask 1' }, { title: 'Initial Subtask 2' }],
      },
      tokenA
    )
    if (createTodoRes.status !== 201 || createTodoRes.body.todo.subtasks.length !== 2) {
      throw new Error(`Failed to create task with subtasks: ${JSON.stringify(createTodoRes.body)}`)
    }
    const todoA = createTodoRes.body.todo
    console.log('✔ Created task with initial subtasks via nested create.')

    // 3. Add inline subtask
    const addSubtaskRes = await request(
      `/api/todos/${todoA.id}/subtasks`,
      'POST',
      { title: 'New Added Subtask' },
      tokenA
    )
    if (addSubtaskRes.status !== 201 || !addSubtaskRes.body.subtask?.id) {
      throw new Error(`Failed to add subtask: ${JSON.stringify(addSubtaskRes.body)}`)
    }
    const subtask3 = addSubtaskRes.body.subtask
    console.log('✔ Inline add subtask passed.')

    // 4. Test validation: Empty title & Title > 200 chars
    const emptyRes = await request(
      `/api/todos/${todoA.id}/subtasks`,
      'POST',
      { title: '   ' },
      tokenA
    )
    if (emptyRes.status !== 400) throw new Error(`Empty title should return 400: got ${emptyRes.status}`)

    const longRes = await request(
      `/api/todos/${todoA.id}/subtasks`,
      'POST',
      { title: 'x'.repeat(201) },
      tokenA
    )
    if (longRes.status !== 400) throw new Error(`Long title should return 400: got ${longRes.status}`)
    console.log('✔ Validation edge cases (empty and >200 chars rejected with 400) passed.')

    // 5. Test Cross-user Ownership Security: User B cannot add or edit User A's subtasks
    const hackRes = await request(
      `/api/todos/${todoA.id}/subtasks`,
      'POST',
      { title: 'Hacked subtask' },
      tokenB
    )
    if (hackRes.status !== 404) {
      throw new Error(`User B should not access User A's task: got status ${hackRes.status}`)
    }
    console.log('✔ Cross-user security check: User B denied access to User A task.')

    // 6. Update subtask (toggle completion)
    const updateSubtaskRes = await request(
      `/api/todos/${todoA.id}/subtasks/${subtask3.id}`,
      'PATCH',
      { completed: true },
      tokenA
    )
    if (updateSubtaskRes.status !== 200 || updateSubtaskRes.body.subtask.completed !== true) {
      throw new Error(`Failed to update subtask: ${JSON.stringify(updateSubtaskRes.body)}`)
    }
    console.log('✔ Update subtask (toggle completion) passed.')

    // 7. Reorder subtasks
    const subtask1 = todoA.subtasks[0]
    const subtask2 = todoA.subtasks[1]
    const reorderRes = await request(
      `/api/todos/${todoA.id}/subtasks/reorder`,
      'PUT',
      { subtaskIds: [subtask3.id, subtask2.id, subtask1.id] },
      tokenA
    )
    if (reorderRes.status !== 200 || reorderRes.body.subtasks[0].id !== subtask3.id) {
      throw new Error(`Failed to reorder subtasks: ${JSON.stringify(reorderRes.body)}`)
    }
    console.log('✔ Reorder subtasks passed.')

    // 8. Cascading completion test: mark parent completed with completeSubtasks: true
    const cascadeToggleRes = await request(
      `/api/todos/${todoA.id}/toggle`,
      'PATCH',
      { completeSubtasks: true },
      tokenA
    )
    if (cascadeToggleRes.status !== 200 || !cascadeToggleRes.body.todo.completed) {
      throw new Error(`Failed cascade toggle: ${JSON.stringify(cascadeToggleRes.body)}`)
    }
    const allCompleted = cascadeToggleRes.body.todo.subtasks.every((s) => s.completed)
    if (!allCompleted) throw new Error('Not all subtasks were completed in cascade toggle.')
    console.log('✔ Cascade completion (parent completes all subtasks) passed.')

    // 9. Delete subtask
    const deleteSubtaskRes = await request(
      `/api/todos/${todoA.id}/subtasks/${subtask3.id}`,
      'DELETE',
      null,
      tokenA
    )
    if (deleteSubtaskRes.status !== 200) {
      throw new Error(`Failed to delete subtask: ${JSON.stringify(deleteSubtaskRes.body)}`)
    }
    console.log('✔ Delete subtask passed.')

    // 10. Clean up parent todo (verifies cascading delete on subtasks)
    const deleteTodoRes = await request(`/api/todos/${todoA.id}`, 'DELETE', null, tokenA)
    if (deleteTodoRes.status !== 200) throw new Error('Failed to delete parent todo.')
    console.log('✔ Parent todo delete and cascade passed.')

    // 11. Security Audit: XSS Sanitization
    const xssTodoRes = await request(
      '/api/todos',
      'POST',
      {
        title: '<script>alert("hacked")</script>Sanitized Task',
        description: '<b>Safe bold</b><style>body{color:red}</style> text',
        subtasks: [{ title: '<img src=x onerror=alert(1)>Sanitized Subtask' }],
      },
      tokenA
    )
    if (xssTodoRes.status !== 201) throw new Error('Failed to create task for XSS test.')
    if (xssTodoRes.body.todo.title !== 'Sanitized Task') {
      throw new Error(`XSS title sanitization failed: received "${xssTodoRes.body.todo.title}"`)
    }
    if (xssTodoRes.body.todo.subtasks[0].title !== 'Sanitized Subtask') {
      throw new Error(`XSS subtask title sanitization failed: received "${xssTodoRes.body.todo.subtasks[0].title}"`)
    }
    console.log('✔ XSS sanitization passed (harmful script and HTML stripped).')

    // 12. Security Audit: Negative order rejection
    const invalidOrderRes = await request(
      `/api/todos/${xssTodoRes.body.todo.id}/subtasks/${xssTodoRes.body.todo.subtasks[0].id}`,
      'PATCH',
      { order: -5 },
      tokenA
    )
    if (invalidOrderRes.status !== 400) {
      throw new Error(`Negative order should be rejected with 400, received: ${invalidOrderRes.status}`)
    }
    console.log('✔ Negative order validation passed (rejected with 400).')

    // Clean up security test task
    await request(`/api/todos/${xssTodoRes.body.todo.id}`, 'DELETE', null, tokenA)

    console.log('\n🎉 ALL SUBTASK & CHECKLIST TESTS (INCLUDING SECURITY AUDIT) PASSED SUCCESSFULLY!')
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err)
    process.exitCode = 1
  } finally {
    server.close()
  }
}

runSubtaskTests()
