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
  RESIDENT_DATE,
  makeFieldKey,
} from './lib/fields.js'
import './styles.css'

const INBOX = '__inbox__'
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
  const [residentFields, setResidentFields] = useState(DEFAULT_RESIDENT_FIELDS)
  const [residentGroupBy, setResidentGroupBy] = useState(null)
  const [taskFields, setTaskFields] = useState(DEFAULT_TASK_FIELDS)
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
      setResidentFields(result.residentFields)
      setResidentGroupBy(result.residentGroupBy)
      setTaskFields(result.taskFields)
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
      const ok = await saveTodos(todos, residentFields, residentGroupBy, taskFields)
      setSaveState(ok ? 'saved' : 'error')
    }, 320)
    return () => clearTimeout(timer)
  }, [todos, residentFields, residentGroupBy, taskFields, source])

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

  const addResidentField = useCallback((field) => {
    setResidentFields((prev) => [...prev, fieldFromDraft(field)])
  }, [])

  const updateResidentField = useCallback((key, patch) => {
    setResidentFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field)),
    )
  }, [])

  const removeResidentField = useCallback((key) => {
    setResidentFields((prev) => prev.filter((field) => field.key !== key))
    setResidentGroupBy((prev) => (prev === key ? null : prev))
    setTodos((prev) =>
      prev.map((t) => {
        if (t.date !== RESIDENT || !t.values || !(key in t.values)) return t
        const values = { ...t.values }
        delete values[key]
        return { ...t, values }
      }),
    )
  }, [])

  const addTaskField = useCallback((field) => {
    setTaskFields((prev) => [...prev, fieldFromDraft(field)])
  }, [])

  const updateTaskField = useCallback((key, patch) => {
    setTaskFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field)),
    )
  }, [])

  const removeTaskField = useCallback((key) => {
    setTaskFields((prev) => prev.filter((field) => field.key !== key))
    setTodos((prev) =>
      prev.map((t) => {
        if (t.date === RESIDENT || !t.values || !(key in t.values)) return t
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

  /**
   * 把任务移动到某一天（dateKey 为 null 表示未安排）。
   * index 是“落点在这一列的渲染位置”，若原位置在落点之前需要回退一位。
   */
  const moveTodo = useCallback((id, dateKey, index) => {
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
          fields={taskFields}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onRemove={removeTodo}
          onRename={renameTodo}
          onMeta={setFieldValue}
          onMove={moveTodo}
          onFieldAdd={addTaskField}
          onFieldUpdate={updateTaskField}
          onFieldRemove={removeTaskField}
          draggingId={dragId}
          onDragStart={setDragId}
          onDragEnd={() => setDragId(null)}
        />

        <ResidentColumn
          dateKey={RESIDENT}
          todos={grouped.get(RESIDENT) ?? []}
          fields={residentFields}
          groupBy={residentGroupBy}
          onGroupBy={setResidentGroupBy}
          onAdd={addTodo}
          onRemove={removeTodo}
          onRename={renameTodo}
          onMeta={setFieldValue}
          onFieldAdd={addResidentField}
          onFieldUpdate={updateResidentField}
          onFieldRemove={removeResidentField}
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
              fields={taskFields}
              onAdd={addTodo}
              onToggle={toggleTodo}
              onRemove={removeTodo}
              onRename={renameTodo}
              onMeta={setFieldValue}
              onMove={moveTodo}
              onFieldAdd={addTaskField}
              onFieldUpdate={updateTaskField}
              onFieldRemove={removeTaskField}
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
