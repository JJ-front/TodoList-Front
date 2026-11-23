import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.resolve(ROOT, 'data/todos.json')

const INBOX_KEY = '__inbox__'
const RESIDENT_KEY = '__resident__'

/**
 * v2 起字段按列存放（columnFields）。旧版前端只会发顶层的 taskFields / residentFields，
 * 写入前先在这里拆成每列一份，避免还开着的旧页面保存时把字段定义丢掉。
 */
function buildColumnFields(parsed, todos, prevColumnFields) {
  // 混用新旧代码的页面会把 residentFields 数组错放进 columnFields 槽位，先接住
  const raw = Array.isArray(parsed.columnFields)
    ? { [RESIDENT_KEY]: parsed.columnFields }
    : parsed.columnFields
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) {
    return raw
  }
  const taskFields = Array.isArray(parsed.taskFields) ? parsed.taskFields : null
  const residentFields = Array.isArray(parsed.residentFields) ? parsed.residentFields : null
  const map = {}
  if (taskFields) {
    map[INBOX_KEY] = taskFields
    for (const todo of todos) {
      const key = todo?.date ?? INBOX_KEY
      if (!map[key]) map[key] = taskFields
    }
  }
  if (residentFields) map[RESIDENT_KEY] = residentFields
  if (Object.keys(map).length > 0) return map
  // 请求体里完全没有字段定义（异常客户端）：沿用文件里已有的定义，避免丢字段
  return prevColumnFields ?? {}
}

/**
 * 让前端直接读写项目里的 data/todos.json。
 * 开发（npm run dev）与预览（npm run preview）都挂载同一套中间件：
 *   GET  /api/todos  -> 返回 data/todos.json 内容
 *   PUT  /api/todos  -> 用请求体覆盖写入 data/todos.json（v2：字段按列存 columnFields）
 */
function todosFileApiPlugin() {
  const handler = (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')

    if (req.method === 'GET') {
      try {
        if (!fs.existsSync(DATA_FILE)) {
          fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
          fs.writeFileSync(DATA_FILE, JSON.stringify({ version: 2, todos: [] }, null, 2))
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
          const todos = Array.isArray(parsed.todos) ? parsed.todos : []
          let prevColumnFields = {}
          try {
            if (fs.existsSync(DATA_FILE)) {
              prevColumnFields = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).columnFields ?? {}
            }
          } catch {
            prevColumnFields = {}
          }
          const payload = {
            version: 2,
            updatedAt: new Date().toISOString(),
            columnFields: buildColumnFields(parsed, todos, prevColumnFields),
            residentGroupBy:
              typeof parsed.residentGroupBy === 'string' ? parsed.residentGroupBy : null,
            todos,
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
