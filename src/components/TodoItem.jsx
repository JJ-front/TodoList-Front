import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconClose } from './Icons.jsx'
import { toHref } from '../lib/fields.js'

export default function TodoItem({
  todo,
  fields = [],
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

  const values = todo.values ?? {}
  // values 优先；旧数据里的 cost / reason / followup 平铺在卡片上，作为回退
  const valueOf = (field) => values[field.key] ?? todo[field.key] ?? ''
  const visibleFields = fields.filter((field) => !(field.hideWhenDone && todo.done))
  const firstEmptyKey = (visibleFields.find((field) => !valueOf(field)) ?? visibleFields[0])?.key

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

      {visibleFields.length > 0 && (
        <div
          ref={metaRef}
          className={`todo__meta ${metaEditing ? 'todo__meta--editing' : ''}`}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setMetaEditing(true)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title={metaEditing ? undefined : '双击编辑字段'}
        >
          {visibleFields.map((field) =>
            metaEditing ? (
              <label className="meta" key={field.key}>
                <span className="meta__label" title={field.label}>
                  {field.label}
                </span>
                <input
                  className="meta__input"
                  value={valueOf(field)}
                  placeholder={
                    field.type === 'link' ? '链接地址，如 zhipin.com/xxx' : `填写${field.label}`
                  }
                  autoFocus={field.key === firstEmptyKey}
                  onChange={(e) => onMeta(todo.id, field.key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setMetaEditing(false)
                  }}
                />
              </label>
            ) : (
              <div className="meta" key={field.key}>
                <span className="meta__label" title={field.label}>
                  {field.label}
                </span>
                {field.type === 'link' && valueOf(field) ? (
                  <a
                    className="meta__link"
                    href={toHref(valueOf(field))}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={valueOf(field)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {valueOf(field)}
                  </a>
                ) : (
                  <span
                    className={`meta__value ${valueOf(field) ? '' : 'meta__value--empty'}`}
                    title={valueOf(field) || undefined}
                  >
                    {valueOf(field) || '—'}
                  </span>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
