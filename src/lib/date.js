export const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, days) {
  const d = startOfDay(date)
  d.setDate(d.getDate() + days)
  return d
}

/** 本地时区的 YYYY-MM-DD，避免 toISOString 的 UTC 偏移 */
export function isoDate(date) {
  const d = startOfDay(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(key) {
  if (!key) return null
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 周一为一周起点 */
export function startOfWeek(date) {
  const d = startOfDay(date)
  const offset = (d.getDay() + 6) % 7
  return addDays(d, -offset)
}

export function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function weekdayName(date) {
  return WEEKDAY_SHORT[date.getDay()]
}

export function isSameDay(a, b) {
  return isoDate(a) === isoDate(b)
}

export function formatFullDate(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function formatRange(weekStart) {
  const end = addDays(weekStart, 6)
  const left = `${weekStart.getMonth() + 1}月${weekStart.getDate()}日`
  const right =
    weekStart.getMonth() === end.getMonth()
      ? `${end.getDate()}日`
      : `${end.getMonth() + 1}月${end.getDate()}日`
  return `${left} – ${right}`
}

/** 相对今天的口语化标签 */
export function relativeLabel(date, today = new Date()) {
  const diff = Math.round((startOfDay(date) - startOfDay(today)) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  if (diff === 2) return '后天'
  return null
}
