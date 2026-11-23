import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DayColumn from './components/DayColumn.jsx'
import ResidentColumn from './components/ResidentColumn.jsx'
import { IconCheck, IconChevron } from './components/Icons.jsx'
import {
  addDays,
  formatFullDate,
  formatRange,
  isoDate,
  parseISO,
  relativeLabel,
  startOfWeek,
  weekDates,
  weekdayName,
} from './lib/date.js'
import { loadTodos, saveTodos } from './lib/store.js'
import {
  DEFAULT_RESIDENT_FIELDS,
  DEFAULT_TASK_FIELDS,
  INBOX_DATE,
  RESIDENT_DATE,
  makeFieldKey,
} from './lib/fields.js'
import './styles.css'

const INBOX = INBOX_DATE
const RESIDENT = RESIDENT_DATE

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `todo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function sortSiblings(a, b) {
  return a.order - b.order || String(a.createdAt).localeCompare(String(b.createdAt))
}

function fieldFromDraft(field) {
  return {
    key: field?.key || makeFieldKey(),
    label: field?.label || '新字段',
    type: field?.type === 'link' ? 'link' : 'text',
  }
}

export default function App() {
  const [todos, setTodos] = useState([])
  const [residentGroupBy, setResidentGroupBy] = useState(null)
  // 每一列一套字段：键为 __inbox__ / 日期（YYYY-MM-DD）/ __resident__
  const [columnFields, setColumnFields] = useState(() => ({
    [INBOX]: DEFAULT_TASK_FIELDS.map((field) => ({ ...field })),
    [RESIDENT]: DEFAULT_RESIDENT_FIELDS.map((field) => ({ ...field })),
  }))
  const [source, setSource] = useState('loading') // loading | file | local
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [dragId, setDragId] = useState(null)
  const firstRender = useRef(true)

  const today = useMemo(() => new Date(), [])
  const todayKey = isoDate(today)

  useEffect(() => {
    let alive = true
    loadTodos().then((result) => {
      if (!alive) return
      setTodos(result.todos)
      setColumnFields(result.columnFields)
      setResidentGroupBy(result.residentGroupBy)
      setSource(result.source)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (source === 'loading') return
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaveState('saving')
    const timer = setTimeout(async () => {
      const ok = await saveTodos(todos, columnFields, residentGroupBy)
      setSaveState(ok ? 'saved' : 'error')
    }, 320)
    return () => clearTimeout(timer)
  }, [todos, columnFields, residentGroupBy, source])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const todo of todos) {
      const key = todo.date ?? INBOX
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(todo)
    }
    for (const list of map.values()) list.sort(sortSiblings)
    return map
  }, [todos])

  const stats = useMemo(() => {
    // 常驻任务是长期跟进清单，不计入「今日 / 全部」完成度
    const scheduled = todos.filter((t) => t.date !== RESIDENT)
    const total = scheduled.length
    const done = scheduled.filter((t) => t.done).length
    const todayList = grouped.get(todayKey) ?? []
    return {
      total,
      done,
      todayTotal: todayList.length,
      todayDone: todayList.filter((t) => t.done).length,
      inbox: (grouped.get(INBOX) ?? []).length,
      resident: (grouped.get(RESIDENT) ?? []).length,
    }
  }, [todos, grouped, todayKey])

  const addTodo = useCallback((dateKey, title) => {
    const text = title.trim()
    if (!text) return
    setTodos((prev) => {
      const siblings = prev.filter((t) => (t.date ?? INBOX) === (dateKey ?? INBOX))
      return [
        ...prev,
        {
          id: makeId(),
          title: text,
          date: dateKey,
          done: false,
          reason: '',
          followup: '',
          cost: '',
          ...(dateKey === RESIDENT ? { values: {} } : {}),
          order: siblings.length,
          createdAt: new Date().toISOString(),
        },
      ]
    })
  }, [])

  const toggleTodo = useCallback((id) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }, [])

  const removeTodo = useCallback((id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const setFieldValue = useCallback((id, key, value) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, values: { ...(t.values ?? {}), [key]: value } } : t,
      ),
    )
  }, [])

  /** 每列各自的字段增删改：只动 columnFields[columnKey]，其他列不受影响 */
  const addField = useCallback((columnKey, field) => {
    setColumnFields((prev) => ({
      ...prev,
      [columnKey]: [...(prev[columnKey] ?? []), fieldFromDraft(field)],
    }))
  }, [])

  const updateField = useCallback((columnKey, key, patch) => {
    setColumnFields((prev) => ({
      ...prev,
      [columnKey]: (prev[columnKey] ?? []).map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    }))
  }, [])

  const removeField = useCallback((columnKey, key) => {
    setColumnFields((prev) => {
      const list = prev[columnKey] ?? []
      if (!list.some((field) => field.key === key)) return prev
      return { ...prev, [columnKey]: list.filter((field) => field.key !== key) }
    })
    if (columnKey === RESIDENT) {
      setResidentGroupBy((prev) => (prev === key ? null : prev))
    }
    // 只清掉本列卡片的对应值；其他列的卡片不受影响
    setTodos((prev) =>
      prev.map((t) => {
        if ((t.date ?? INBOX) !== columnKey || !t.values || !(key in t.values)) return t
        const values = { ...t.values }
        delete values[key]
        return { ...t, values }
      }),
    )
  }, [])

  const renameTodo = useCallback((id, title) => {
    const text = title.trim()
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: text || t.title } : t)),
    )
  }, [])

  // 事件发生时要先知道卡片来自哪一列，用 ref 镜像一份最新的 todos
  const todosRef = useRef(todos)
  todosRef.current = todos

  /**
   * 把任务移动到某一天（dateKey 为 null 表示未安排）。
   * index 是“落点在这一列的渲染位置”，若原位置在落点之前需要回退一位。
   * 跨列拖动时字段自动对齐：目标列比原列多的字段直接在卡片上按空值显示；
   * 原列比目标列多的字段补进目标列（列里已有卡片按空值显示），已填的值原样保留。
   */
  const moveTodo = useCallback((id, dateKey, index) => {
    const targetKey = dateKey ?? INBOX
    const movingNow = todosRef.current.find((t) => t.id === id)
    if (movingNow) {
      const sourceKey = movingNow.date ?? INBOX
      if (sourceKey !== targetKey) {
        setColumnFields((prev) => {
          const source = prev[sourceKey] ?? []
          const target = prev[targetKey] ?? []
          const known = new Set(target.map((field) => field.key))
          const missing = source.filter((field) => !known.has(field.key))
          if (missing.length === 0) return prev
          return {
            ...prev,
            [targetKey]: [...target, ...missing.map((field) => ({ ...field }))],
          }
        })
      }
    }
    setTodos((prev) => {
      const moving = prev.find((t) => t.id === id)
      if (!moving) return prev
      const targetKey = dateKey ?? INBOX
      const currentKey = moving.date ?? INBOX
      const targetList = prev.filter((t) => (t.date ?? INBOX) === targetKey).sort(sortSiblings)
      const currentIndex = targetList.findIndex((t) => t.id === id)
      let drop = index == null ? targetList.length : index
      if (currentIndex !== -1 && drop > currentIndex) drop -= 1
      drop = Math.max(0, Math.min(drop, currentIndex === -1 ? targetList.length : targetList.length - 1))

      const reordered = targetList.filter((t) => t.id !== id)
      reordered.splice(drop, 0, { ...moving, date: dateKey })
      const map = new Map(reordered.map((t, i) => [t.id, { date: dateKey, order: i }]))

      if (currentKey !== targetKey) {
        const rest = prev
          .filter((t) => (t.date ?? INBOX) === currentKey && t.id !== id)
          .sort(sortSiblings)
        rest.forEach((t, i) => map.set(t.id, { date: t.date, order: i }))
      }

      return prev.map((t) => {
        const patch = map.get(t.id)
        return patch ? { ...t, ...patch } : t
      })
    })
  }, [])

  const days = useMemo(() => weekDates(weekStart), [weekStart])

  // 某列第一次被渲染到（例如翻到新的一周）时，以「未安排」列的字段为模板补一份自己的，
  // 之后每列字段的加减互不影响；补上的内容会随保存写进数据文件。
  useEffect(() => {
    const keys = [INBOX, RESIDENT, ...days.map(isoDate)]
    setColumnFields((prev) => {
      let next = null
      for (const key of keys) {
        if (prev[key]) continue
        next ??= { ...prev }
        next[key] =
          key === RESIDENT
            ? (prev[RESIDENT] ?? DEFAULT_RESIDENT_FIELDS).map((field) => ({ ...field }))
            : (prev[INBOX] ?? DEFAULT_TASK_FIELDS).map((field) => ({ ...field }))
      }
      return next ?? prev
    })
  }, [days, columnFields])

  const fieldsFor = (key) => columnFields[key] ?? columnFields[INBOX] ?? DEFAULT_TASK_FIELDS
  const isThisWeek = isoDate(startOfWeek(today)) === isoDate(weekStart)

  const offView = useMemo(() => {
    const inView = new Set([INBOX, RESIDENT, ...days.map(isoDate)])
    return todos.filter((t) => t.date && !inView.has(t.date)).length
  }, [todos, days])

  const statusText = {
    loading: '正在读取 data/todos.json…',
    saving: '保存中…',
    saved: '已写入 data/todos.json',
    idle: source === 'local' ? '本地缓存模式（未连上文件接口）' : '已就绪',
    error: '保存失败，已退回本地缓存',
  }[saveState === 'idle' ? 'idle' : saveState]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">
            <IconCheck size={19} strokeWidth={2.6} />
          </span>
          <div>
            <h1>TodoList</h1>
            <p className="brand__sub">
              {formatFullDate(today)} · {weekdayName(today)}
              {relativeLabel(today) ? ` · ${relativeLabel(today)}` : ''}
            </p>
          </div>
        </div>

        <div className="topbar__meta">
          <div className="stat">
            <strong>{stats.todayDone}/{stats.todayTotal}</strong>
            <span>今日完成</span>
          </div>
          <div className="stat">
            <strong>{stats.done}/{stats.total}</strong>
            <span>全部完成</span>
          </div>
          <div className="stat">
            <strong>{stats.resident}</strong>
            <span>常驻跟进</span>
          </div>
          <div className="stat stat--muted">
            <strong>{stats.inbox}</strong>
            <span>未安排</span>
          </div>
          <div className={`savestate savestate--${saveState}`}>
            <i />
            {statusText}
          </div>
        </div>
      </header>

      <nav className="weekbar">
        <div className="weekbar__left">
          <button
            className="navbtn"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            aria-label="上一周"
          >
            <IconChevron dir="left" />
          </button>
          <div className="weekbar__title">
            <strong>{formatRange(weekStart)}</strong>
            <span>{isThisWeek ? '本周' : '非本周视图'}</span>
          </div>
          <button
            className="navbtn"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            aria-label="下一周"
          >
            <IconChevron dir="right" />
          </button>
          {!isThisWeek && (
            <button className="ghostbtn" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              回到本周
            </button>
          )}
        </div>
        <p className="weekbar__hint">
          {offView > 0 && <span className="weekbar__off">另有 {offView} 项在其他周 · </span>}
          把任务卡片拖到任意一天的列里即可换日期，拖回「未安排」即取消排期
        </p>
      </nav>

      <main className={`board ${dragId ? 'board--dragging' : ''}`}>
        <DayColumn
          variant="inbox"
          dateKey={null}
          label="未安排"
          sublabel="拖入某一天来排期"
          todos={grouped.get(INBOX) ?? []}
          fields={fieldsFor(INBOX)}
          columnKey={INBOX}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onRemove={removeTodo}
          onRename={renameTodo}
          onMeta={setFieldValue}
          onMove={moveTodo}
          onFieldAdd={addField}
          onFieldUpdate={updateField}
          onFieldRemove={removeField}
          draggingId={dragId}
          onDragStart={setDragId}
          onDragEnd={() => setDragId(null)}
        />

        <ResidentColumn
          dateKey={RESIDENT}
          todos={grouped.get(RESIDENT) ?? []}
          fields={fieldsFor(RESIDENT)}
          columnKey={RESIDENT}
          groupBy={residentGroupBy}
          onGroupBy={setResidentGroupBy}
          onAdd={addTodo}
          onRemove={removeTodo}
          onRename={renameTodo}
          onMeta={setFieldValue}
          onFieldAdd={addField}
          onFieldUpdate={updateField}
          onFieldRemove={removeField}
        />

        {days.map((date) => {
          const key = isoDate(date)
          const relative = relativeLabel(date, today)
          return (
            <DayColumn
              key={key}
              variant="day"
              dateKey={key}
              label={weekdayName(date)}
              sublabel={`${date.getMonth() + 1} 月 ${date.getDate()} 日`}
              badge={relative}
              isToday={key === todayKey}
              isWeekend={date.getDay() === 0 || date.getDay() === 6}
              todos={grouped.get(key) ?? []}
              fields={fieldsFor(key)}
              columnKey={key}
              onAdd={addTodo}
              onToggle={toggleTodo}
              onRemove={removeTodo}
              onRename={renameTodo}
              onMeta={setFieldValue}
              onMove={moveTodo}
              onFieldAdd={addField}
              onFieldUpdate={updateField}
              onFieldRemove={removeField}
              draggingId={dragId}
              onDragStart={setDragId}
              onDragEnd={() => setDragId(null)}
            />
          )
        })}
      </main>

      <footer className="footbar">
        <span>
          数据文件：<code>data/todos.json</code>
        </span>
        <span className="footbar__dot" />
        <span>
          当前来源：{source === 'file' ? '项目文件（/api/todos）' : source === 'local' ? '浏览器 localStorage' : '读取中'}
        </span>
        <span className="footbar__dot" />
        <span>双击任务标题可以重命名</span>
      </footer>
    </div>
  )
}
