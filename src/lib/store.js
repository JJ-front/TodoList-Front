const API_URL = '/api/todos'
const STORAGE_KEY = 'todolist-front::todos'

function normalize(payload) {
  const list = Array.isArray(payload) ? payload : payload?.todos
  if (!Array.isArray(list)) return []
  return list
    .filter((t) => t && typeof t.title === 'string')
    .map((t, i) => ({
      id: String(t.id ?? `t-${Date.now()}-${i}`),
      title: t.title,
      date: t.date ?? null,
      done: Boolean(t.done),
      reason: typeof t.reason === 'string' ? t.reason : '',
      event: typeof t.event === 'string' ? t.event : '',
      order: Number.isFinite(t.order) ? t.order : i,
      createdAt: t.createdAt ?? new Date().toISOString(),
    }))
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return normalize(JSON.parse(raw))
  } catch {
    return []
  }
}

function writeLocal(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    return true
  } catch {
    return false
  }
}

/**
 * 优先读项目里的 data/todos.json（由 vite 插件提供的 /api/todos）。
 * 如果接口不可用（例如直接打开 dist/index.html），退回 localStorage。
 * 返回 source: 'file' | 'local'
 */
export async function loadTodos() {
  try {
    const res = await fetch(API_URL, { headers: { Accept: 'application/json' } })
    const text = await res.text()
    if (res.ok && text.trim().startsWith('{')) {
      const parsed = JSON.parse(text)
      // 文件接口可用时以文件为准，即使列表为空（用户可能清空了任务）
      return { todos: normalize(parsed), source: 'file' }
    }
  } catch {
    /* 接口不可用，走兜底 */
  }
  return { todos: readLocal(), source: 'local' }
}

export async function saveTodos(todos) {
  const body = JSON.stringify({ version: 1, todos })
  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (res.ok) return true
  } catch {
    /* 继续尝试本地存储 */
  }
  return writeLocal(todos)
}
