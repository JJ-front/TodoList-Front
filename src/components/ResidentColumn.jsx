import { useEffect, useRef, useState } from 'react'
import FieldManager from './FieldManager.jsx'
import ResidentItem from './ResidentItem.jsx'
import { IconPlus } from './Icons.jsx'

export default function ResidentColumn({
  dateKey,
  todos,
  fields,
  onAdd,
  onRemove,
  onRename,
  onMeta,
  onFieldAdd,
  onFieldUpdate,
  onFieldRemove,
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [managing, setManaging] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const commit = () => {
    const text = draft.trim()
    if (text) onAdd(dateKey, text)
    setDraft('')
    setAdding(false)
  }

  return (
    <section className="col col--resident" data-date={dateKey ?? 'resident'}>
      <header className="col__head">
        <div className="col__headline">
          <span className="col__label">常驻任务</span>
          <span className="col__badge">每天跟进</span>
          <button
            type="button"
            className={`col__config ${managing ? 'col__config--on' : ''}`}
            aria-expanded={managing}
            onClick={() => setManaging((value) => !value)}
          >
            字段
          </button>
        </div>
        <span className="col__sublabel">简历投递进度</span>
        <div className="col__progress col__progress--resident">
          <span className="col__count">{todos.length} 家公司在跟进</span>
        </div>
      </header>

      {managing && (
        <FieldManager
          fields={fields}
          onAdd={onFieldAdd}
          onUpdate={onFieldUpdate}
          onRemove={onFieldRemove}
        />
      )}

      <div className="col__list">
        {todos.map((todo) => (
          <ResidentItem
            key={todo.id}
            todo={todo}
            fields={fields}
            onRemove={onRemove}
            onRename={onRename}
            onMeta={onMeta}
          />
        ))}
        {todos.length === 0 && (
          <p className="col__empty">添加公司名，开始跟进投递进度</p>
        )}
      </div>

      <div className="col__foot">
        {adding ? (
          <div className="adder">
            <input
              ref={inputRef}
              className="adder__input"
              value={draft}
              placeholder="公司名，回车保存"
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
            <span>添加公司</span>
          </button>
        )}
      </div>
    </section>
  )
}
