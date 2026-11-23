/** 常驻任务列的固定标识：不属于任何一天 */
export const RESIDENT_DATE = '__resident__'

/** 常驻任务列的默认字段 */
export const DEFAULT_RESIDENT_FIELDS = [
  { key: 'progress', label: '进度', type: 'text' },
  { key: 'url', label: '链接', type: 'link' },
]

/** 未安排 / 每日任务卡的默认字段（原因、后续安排只在未完成时显示） */
export const DEFAULT_TASK_FIELDS = [
  { key: 'cost', label: '耗时', type: 'text' },
  { key: 'reason', label: '原因', type: 'text', hideWhenDone: true },
  { key: 'followup', label: '后续安排', type: 'text', hideWhenDone: true },
]

export function makeFieldKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `field-${crypto.randomUUID()}`
  return `field-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

/**
 * 字段定义存在数据文件顶层，同一套字段对所有卡片生效。
 * 传入的不是数组（例如旧数据里没有这个键）时退回默认字段。
 */
export function normalizeFields(input, defaults) {
  if (!Array.isArray(input)) return defaults.map((field) => ({ ...field }))

  const seen = new Set()
  const fields = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const key = typeof raw.key === 'string' ? raw.key.trim() : ''
    if (!key || seen.has(key)) continue
    seen.add(key)
    const field = {
      key,
      label: typeof raw.label === 'string' && raw.label.trim() ? raw.label : '未命名字段',
      type: raw.type === 'link' ? 'link' : 'text',
    }
    if (raw.hideWhenDone) field.hideWhenDone = true
    fields.push(field)
  }
  return fields
}

export function normalizeResidentFields(input) {
  return normalizeFields(input, DEFAULT_RESIDENT_FIELDS)
}

export function normalizeTaskFields(input) {
  return normalizeFields(input, DEFAULT_TASK_FIELDS)
}

/** 允许只填 zhipin.com/xxx，渲染时补上协议 */
export function toHref(url) {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
