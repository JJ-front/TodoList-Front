import { useEffect, useRef, useState } from 'react'
import TodoItem from './TodoItem.jsx'
import { IconPlus } from './Icons.jsx'

export default function DayColumn({
  variant,
  dateKey,
  label,
  sublabel,
  badge,
  isToday = false,
  isWeekend = false,
  todos,
  onAdd,
  onToggle,
  onRemove,
  onRename,
  onMeta,
  onMove,
  draggingId,
  onDragStart,
  onDragEnd,
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [dropIndex, setDropIndex] = useState(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  // 拖拽结束（含取消）时清掉落点高亮，避免列一直亮着
  useEffect(() => {
    if (draggingId == null) setDropIndex(null)
  }, [draggingId])

  const done = todos.filter((t) => t.done).length
  const total = todos.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const commit = () => {
    const text = draft.trim()
    if (text) onAdd(dateKey, text)
    setDraft('')
    setAdding(false)
  }

  const computeDropIndex = (clientY) => {
    const cards = Array.from(listRef.current?.querySelectorAll('[data-todo-card]') ?? [])
    let idx = cards.length
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        idx = i
        break
      }
    }
    return idx
  }

  const isTodoDrag = (event) =>
    draggingId != null || Array.from(event.dataTransfer?.types ?? []).includes('text/plain')

  const handleDragOver = (event) => {
    if (!isTodoDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const next = computeDropIndex(event.clientY)
    setDropIndex((prev) => (prev === next ? prev : next))
  }

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setDropIndex(null)
  }

  const handleDrop = (event) => {
    if (!isTodoDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    const id = event.dataTransfer.getData('text/plain') || draggingId
    const idx = dropIndex
    setDropIndex(null)
    if (id) onMove(id, dateKey, idx)
    onDragEnd()
  }

  const className = [
    'col',
    variant === 'inbox' ? 'col--inbox' : 'col--day',
    isToday ? 'col--today' : '',
    isWeekend && !isToday ? 'col--weekend' : '',
    dropIndex !== null ? 'col--over' : '',
    total > 0 && done === total ? 'col--complete' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const rows = []
  todos.forEach((todo, index) => {
    if (dropIndex === index) rows.push(<div key={`line-${index}`} className="dropline" />)
    rows.push(
      <TodoItem
        key={todo.id}
        todo={todo}
        dragging={draggingId === todo.id}
        onToggle={onToggle}
        onRemove={onRemove}
        onRename={onRename}
        onMeta={onMeta}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />,
    )
  })
  if (dropIndex === todos.length && todos.length >= 0 && dropIndex !== null) {
    rows.push(<div key="line-end" className="dropline" />)
  }

  return (
    <section
      className={className}
      data-date={dateKey ?? 'inbox'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="col__head">
        <div className="col__headline">
          <span className="col__label">{label}</span>
          {badge && <span className="col__badge">{badge}</span>}
          {isToday && !badge && <span className="col__badge">今天</span>}
        </div>
        <span className="col__sublabel">{sublabel}</span>
        <div className="col__progress">
          <div className="col__bar" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </div>
          <span className="col__count">
            {done}/{total}
          </span>
        </div>
      </header>

      <div className="col__list" ref={listRef}>
        {rows}
        {todos.length === 0 && dropIndex === null && (
          <p className="col__empty">{variant === 'inbox' ? '暂无待排期的任务' : '把任务拖到这里'}</p>
        )}
      </div>

      <div className="col__foot">
        {adding ? (
          <div className="adder">
            <input
              ref={inputRef}
              className="adder__input"
              value={draft}
              placeholder="任务名称，回车保存"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') {
                  setDraft('')
                  setAdding(false)
                }
              }}
              onBlur={commit}
            />
          </div>
        ) : (
          <button className="addbtn" onClick={() => setAdding(true)}>
            <IconPlus size={11} />
            <span>添加任务</span>
          </button>
        )}
      </div>
    </section>
  )
}
