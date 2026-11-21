import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconClose } from './Icons.jsx'

export default function TodoItem({
  todo,
  dragging,
  onToggle,
  onRemove,
  onRename,
  onMeta,
  onDragStart,
  onDragEnd,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const [metaEditing, setMetaEditing] = useState(false)
  const inputRef = useRef(null)
  const metaRef = useRef(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  // 双击进入后，点卡片外面自动收起
  useEffect(() => {
    if (!metaEditing) return
    const handleDown = (event) => {
      if (!metaRef.current?.contains(event.target)) setMetaEditing(false)
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [metaEditing])

  const metaFields = [{ key: 'cost', label: '耗时', placeholder: '如 1.5h / 40 分钟' }]
  if (!todo.done) {
    metaFields.push(
      { key: 'reason', label: '原因', placeholder: '为什么没完成' },
      { key: 'event', label: '事件', placeholder: '相关事件 / 后续安排' },
    )
  }
  const firstEmptyKey = (metaFields.find((field) => !todo[field.key]) ?? metaFields[0]).key

  const finish = () => {
    onRename(todo.id, draft)
    setEditing(false)
  }

  return (
    <div
      className={`todo ${todo.done ? 'todo--done' : 'todo--undone'} ${dragging ? 'todo--dragging' : ''}`}
      data-todo-card
      data-todo-id={todo.id}
      draggable={!editing && !metaEditing}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', todo.id)
        onDragStart(todo.id)
      }}
      onDragEnd={onDragEnd}
      onDoubleClick={() => {
        setDraft(todo.title)
        setEditing(true)
      }}
      title="拖到别的日期即可改排期，双击标题可重命名"
    >
      <div className="todo__row">
        <button
          type="button"
          className={`todo__status ${todo.done ? 'todo__status--done' : 'todo__status--undone'}`}
          aria-pressed={todo.done}
          aria-label={todo.done ? '标记为未完成' : '标记为已完成'}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(todo.id)
          }}
        >
          {todo.done ? (
            <IconCheck size={11} strokeWidth={2.6} />
          ) : (
            <IconClose size={11} strokeWidth={2.4} />
          )}
        </button>

        {editing ? (
          <input
            ref={inputRef}
            className="todo__editor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={finish}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finish()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span className="todo__title">{todo.title}</span>
        )}

        <button
          type="button"
          className="todo__del"
          aria-label="删除任务"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(todo.id)
          }}
        >
          <IconClose size={11} />
        </button>
      </div>

      <div
        ref={metaRef}
        className={`todo__meta ${metaEditing ? 'todo__meta--editing' : ''}`}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setMetaEditing(true)
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        title={metaEditing ? undefined : '双击编辑耗时 / 原因 / 事件'}
      >
        {metaFields.map((field) =>
          metaEditing ? (
            <label className="meta" key={field.key}>
              <span className="meta__label">{field.label}</span>
              <input
                className="meta__input"
                value={todo[field.key] ?? ''}
                placeholder={field.placeholder}
                autoFocus={field.key === firstEmptyKey}
                onChange={(e) => onMeta(todo.id, field.key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setMetaEditing(false)
                }}
              />
            </label>
          ) : (
            <div className="meta" key={field.key}>
              <span className="meta__label">{field.label}</span>
              <span
                className={`meta__value ${todo[field.key] ? '' : 'meta__value--empty'}`}
                title={todo[field.key] || undefined}
              >
                {todo[field.key] || '—'}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
