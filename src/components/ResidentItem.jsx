import { useEffect, useRef, useState } from 'react'
import { IconClose } from './Icons.jsx'
import { toHref } from '../lib/fields.js'

export default function ResidentItem({ todo, fields, onRemove, onRename, onMeta }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const [metaEditing, setMetaEditing] = useState(false)
  const inputRef = useRef(null)
  const metaRef = useRef(null)

  const values = todo.values ?? {}

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  // 双击字段区进入编辑后，点卡片外面自动收起
  useEffect(() => {
    if (!metaEditing) return
    const handleDown = (event) => {
      if (!metaRef.current?.contains(event.target)) setMetaEditing(false)
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [metaEditing])

  const inputPlaceholder = (field) =>
    field.type === 'link' ? '链接地址，如 zhipin.com/xxx' : `填写${field.label}`

  const firstEmptyKey = (fields.find((field) => !values[field.key]) ?? fields[0])?.key

  const finish = () => {
    onRename(todo.id, draft)
    setEditing(false)
  }

  return (
    <div
      className={`todo todo--resident ${metaEditing ? 'todo--meta-open' : ''}`}
      data-todo-card
      data-todo-id={todo.id}
      draggable={false}
      title="常驻任务：双击公司名可改名，双击下方字段可编辑自定义字段"
    >
      <div className="todo__row">
        <span className="resident__dot" aria-hidden />

        {editing ? (
          <input
            ref={inputRef}
            className="todo__editor"
            value={draft}
            placeholder="公司名"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={finish}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finish()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span
            className="todo__title"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setDraft(todo.title)
              setEditing(true)
            }}
          >
            {todo.title || '未命名公司'}
          </span>
        )}

        <button
          type="button"
          className="todo__del"
          aria-label="删除常驻任务"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(todo.id)
          }}
        >
          <IconClose size={11} />
        </button>
      </div>

      {fields.length > 0 && (
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
          {fields.map((field) =>
            metaEditing ? (
              <label className="meta" key={field.key}>
                <span className="meta__label" title={field.label}>
                  {field.label}
                </span>
                <input
                  className="meta__input"
                  value={values[field.key] ?? ''}
                  placeholder={inputPlaceholder(field)}
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
                {field.type === 'link' && values[field.key] ? (
                  <a
                    className="meta__link"
                    href={toHref(values[field.key])}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={values[field.key]}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {values[field.key]}
                  </a>
                ) : (
                  <span
                    className={`meta__value ${values[field.key] ? '' : 'meta__value--empty'}`}
                    title={values[field.key] || undefined}
                  >
                    {values[field.key] || '—'}
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
