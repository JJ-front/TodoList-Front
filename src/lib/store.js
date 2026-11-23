import {
  RESIDENT_DATE,
  normalizeResidentFields,
  normalizeTaskFields,
} from './fields.js'

const API_URL = '/api/todos'
const STORAGE_KEY = 'todolist-front::todos'

function normalizeValues(t) {
  const values = {}
  if (t.values && typeof t.values === 'object' && !Array.isArray(t.values)) {
    for (const [key, value] of Object.entries(t.values)) {
      if (typeof value === 'string') values[key] = value
    }
  }
  return values
}

function normalizeTodo(t, i) {
  const date = t.date ?? null
  const todo = {
    id: String(t.id ?? `t-${Date.now()}-${i}`),
    title: t.title,
    date,
    done: Boolean(t.done),
    reason: typeof t.reason === 'string' ? t.reason : '',
    // 「后续安排」新字段；兼容早期写成 event 的数据
    followup:
      typeof t.followup === 'string' ? t.followup : typeof t.event === 'string' ? t.event : '',
    cost: typeof t.cost === 'string' ? t.cost : '',
    order: Number.isFinite(t.order) ? t.order : i,
    createdAt: t.createdAt ?? new Date().toISOString(),
  }

  // 自定义字段的值统一放在 values 里；读取时优先用 values，其次回退到旧的平铺字段。
  const values = normalizeValues(t)
  if (date === RESIDENT_DATE) {
    // 旧数据把常驻任务的进度 / 链接平铺在 progress、url 上
    if (typeof t.progress === 'string' && values.progress === undefined) {
      values.progress = t.progress
    }
    if (typeof t.url === 'string' && values.url === undefined) {
      values.url = t.url
    }
  }
  if (Object.keys(values).length > 0 || date === RESIDENT_DATE) todo.values = values

  return todo
}

function normalizePayload(payload) {
  const list = Array.isArray(payload) ? payload : payload?.todos
  const todos = Array.isArray(list)
    ? list.filter((t) => t && typeof t.title === 'string').map(normalizeTodo)
    : []
  return {
    todos,
    residentFields: normalizeResidentFields(
      Array.isArray(payload) ? undefined : payload?.residentFields,
    ),
    taskFields: normalizeTaskFields(
      Array.isArray(payload) ? undefined : payload?.taskFields,
    ),
  }
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return normalizePayload(null)
    return normalizePayload(JSON.parse(raw))
  } catch {
    return normalizePayload(null)
  }
}

function writeLocal(todos, residentFields, taskFields) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, todos, residentFields, taskFields }),
    )
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
      return { ...normalizePayload(parsed), source: 'file' }
    }
  } catch {
    /* 接口不可用，走兜底 */
  }
  return { ...readLocal(), source: 'local' }
}

export async function saveTodos(todos, residentFields, taskFields) {
  const body = JSON.stringify({ version: 1, todos, residentFields, taskFields })
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
  return writeLocal(todos, residentFields, taskFields)
}
