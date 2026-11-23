import {
  INBOX_DATE,
  RESIDENT_DATE,
  normalizeFields,
  normalizeResidentFields,
  normalizeTaskFields,
} from './fields.js'

const API_URL = '/api/todos'
const STORAGE_KEY = 'todolist-front::todos'

const INBOX = INBOX_DATE
const RESIDENT = RESIDENT_DATE

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

function cloneFields(list) {
  return list.map((field) => ({ ...field }))
}

/**
 * v2：字段按列存放在 columnFields 里，键为 __inbox__ / 日期（YYYY-MM-DD）/ __resident__，
 * 每一列一套，增删互不影响。
 * 兼容 v1（顶层共享的 taskFields / residentFields）：拆成每个出现过的任务列各一份，
 * 常驻列沿用 residentFields，旧数据打开后的显示和拆分前一致。
 */
function normalizeColumnFields(payload, todos, taskFields, residentFields) {
  const map = {}
  const raw = payload?.columnFields
  const hasRaw = raw && typeof raw === 'object' && !Array.isArray(raw)

  if (hasRaw) {
    for (const [key, list] of Object.entries(raw)) {
      if (typeof key !== 'string' || !key.trim()) continue
      map[key] = normalizeFields(list, [])
    }
    // 半新半旧的数据里缺的入口，用旧字段补齐
    if (!map[INBOX]) map[INBOX] = cloneFields(taskFields)
    if (!map[RESIDENT]) map[RESIDENT] = cloneFields(residentFields)
    return map
  }

  map[INBOX] = cloneFields(taskFields)
  map[RESIDENT] = cloneFields(residentFields)
  for (const todo of todos) {
    const key = todo.date ?? INBOX
    if (!map[key]) map[key] = cloneFields(taskFields)
  }
  return map
}

function normalizePayload(payload) {
  const isObject = payload && typeof payload === 'object' && !Array.isArray(payload)
  const list = Array.isArray(payload) ? payload : isObject ? payload.todos : undefined
  const todos = Array.isArray(list)
    ? list.filter((t) => t && typeof t.title === 'string').map(normalizeTodo)
    : []
  const taskFields = normalizeTaskFields(isObject ? payload.taskFields : undefined)
  const residentFields = normalizeResidentFields(isObject ? payload.residentFields : undefined)
  return {
    todos,
    columnFields: normalizeColumnFields(
      isObject ? payload : null,
      todos,
      taskFields,
      residentFields,
    ),
    residentGroupBy:
      isObject && typeof payload.residentGroupBy === 'string' ? payload.residentGroupBy : null,
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

function writeLocal(todos, columnFields, residentGroupBy) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, todos, columnFields, residentGroupBy }),
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

export async function saveTodos(todos, columnFields, residentGroupBy) {
  const body = JSON.stringify({ version: 2, todos, columnFields, residentGroupBy })
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
  return writeLocal(todos, columnFields, residentGroupBy)
}
