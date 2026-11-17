import { useEffect, useRef, useState } from 'react'
import { IconClose } from './Icons.jsx'

export default function TodoItem({ todo, dragging, onToggle, onRemove, onRename, onDragStart, onDragEnd }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
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
      className={`todo ${todo.done ? 'todo--done' : ''} ${dragging ? 'todo--dragging' : ''}`}
      data-todo-card
      data-todo-id={todo.id}
      draggable={!editing}
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
      <button
        type="button"
        className="todo__check"
        aria-pressed={todo.done}
        aria-label={todo.done ? '标记为未完成' : '标记为已完成'}
        onClick={(e) => {
          e.stopPropagation()
          onToggle(todo.id)
        }}
      >
        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
          <path
            d="M3.2 8.4l3.1 3.1 6.5-6.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
  )
}
