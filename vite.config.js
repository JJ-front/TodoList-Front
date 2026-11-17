import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.resolve(ROOT, 'data/todos.json')

/**
 * 让前端直接读写项目里的 data/todos.json。
 * 开发（npm run dev）与预览（npm run preview）都挂载同一套中间件：
 *   GET  /api/todos  -> 返回 data/todos.json 内容
 *   PUT  /api/todos  -> 用请求体覆盖写入 data/todos.json
 */
function todosFileApiPlugin() {
  const handler = (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')

    if (req.method === 'GET') {
      try {
        if (!fs.existsSync(DATA_FILE)) {
          fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
          fs.writeFileSync(DATA_FILE, JSON.stringify({ version: 1, todos: [] }, null, 2))
        }
        res.statusCode = 200
        res.end(fs.readFileSync(DATA_FILE, 'utf8'))
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ ok: false, error: String(err) }))
      }
      return
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
        if (body.length > 5 * 1024 * 1024) req.destroy()
      })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          const payload = {
            version: 1,
            updatedAt: new Date().toISOString(),
            todos: Array.isArray(parsed.todos) ? parsed.todos : [],
          }
          fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
          fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8')
          res.statusCode = 200
          res.end(JSON.stringify({ ok: true, count: payload.todos.length }))
        } catch (err) {
          res.statusCode = 400
          res.end(JSON.stringify({ ok: false, error: String(err) }))
        }
      })
      return
    }

    res.statusCode = 405
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }))
  }

  return {
    name: 'todos-file-api',
    configureServer(server) {
      server.middlewares.use('/api/todos', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/todos', handler)
    },
  }
}

export default defineConfig({
  plugins: [react(), todosFileApiPlugin()],
  server: { port: 5173, open: true },
  preview: { port: 4173 },
})
