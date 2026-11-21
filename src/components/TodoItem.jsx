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
  const [metaFocus, setMetaFocus] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const finish = () => {
    onRename(todo.id, draft)
    setEditing(false)
  }

  return (
    <div
      className={`todo ${todo.done ? 'todo--done' : 'todo--undone'} ${dragging ? 'todo--dragging' : ''}`}
      data-todo-card
      data-todo-id={todo.id}
      draggable={!editing && !metaFocus}
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

      {!todo.done && (
        <div
          className="todo__meta"
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <label className="meta">
            <span className="meta__label">原因</span>
            <input
              className="meta__input"
              value={todo.reason ?? ''}
              placeholder="为什么没完成"
              onChange={(e) => onMeta(todo.id, 'reason', e.target.value)}
              onFocus={() => setMetaFocus(true)}
              onBlur={() => setMetaFocus(false)}
            />
          </label>
          <label className="meta">
            <span className="meta__label">事件</span>
            <input
              className="meta__input"
              value={todo.event ?? ''}
              placeholder="相关事件 / 后续安排"
              onChange={(e) => onMeta(todo.id, 'event', e.target.value)}
              onFocus={() => setMetaFocus(true)}
              onBlur={() => setMetaFocus(false)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
