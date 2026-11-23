import { useEffect, useMemo, useRef, useState } from 'react'
import FieldManager from './FieldManager.jsx'
import ResidentItem from './ResidentItem.jsx'
import { IconPlus } from './Icons.jsx'
import { RESIDENT_DATE } from '../lib/fields.js'

const EMPTY_GROUP = '__empty__'

export default function ResidentColumn({
  dateKey,
  columnKey = dateKey ?? RESIDENT_DATE,
  todos,
  fields,
  groupBy,
  onGroupBy,
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
  const [grouping, setGrouping] = useState(false)
  const inputRef = useRef(null)
  const groupRef = useRef(null)
  const groupPanelRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  // 分组面板打开时，点外面收起
  useEffect(() => {
    if (!grouping) return
    const handleDown = (event) => {
      if (groupRef.current?.contains(event.target)) return
      if (groupPanelRef.current?.contains(event.target)) return
      setGrouping(false)
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [grouping])

  // 只允许按文本字段分组；字段被删掉后自动退回不分组
  const groupField = fields.find((field) => field.key === groupBy && field.type !== 'link') ?? null

  const groups = useMemo(() => {
    if (!groupField) return null
    const map = new Map()
    for (const todo of todos) {
      const raw = todo.values?.[groupField.key]
      const value = typeof raw === 'string' ? raw.trim() : ''
      const key = value || EMPTY_GROUP
      const entry = map.get(key)
      if (entry) entry.todos.push(todo)
      else map.set(key, { key, label: value || '未填写', empty: !value, todos: [todo] })
    }
    return [...map.values()].sort(
      (a, b) => b.todos.length - a.todos.length || a.label.localeCompare(b.label, 'zh-Hans-CN'),
    )
  }, [todos, groupField])

  const textFields = fields.filter((field) => field.type !== 'link')

  const chooseGroup = (key) => {
    onGroupBy(key)
    setGrouping(false)
  }

  const commit = () => {
    const text = draft.trim()
    if (text) onAdd(dateKey, text)
    setDraft('')
    setAdding(false)
  }

  const renderItems = (list) =>
    list.map((todo) => (
      <ResidentItem
        key={todo.id}
        todo={todo}
        fields={fields}
        onRemove={onRemove}
        onRename={onRename}
        onMeta={onMeta}
      />
    ))

  return (
    <section className="col col--resident" data-date={dateKey ?? 'resident'}>
      <header className="col__head">
        <div className="col__headline">
          <span className="col__label">常驻任务</span>
          <span className="col__badge">每天跟进</span>
          <div className="col__actions" ref={groupRef}>
            <button
              type="button"
              className={`col__config col__config--group ${groupField ? 'col__config--on' : ''}`}
              aria-expanded={grouping}
              title={groupField ? `当前按「${groupField.label}」分组` : '按字段值分组'}
              onClick={() => setGrouping((value) => !value)}
            >
              <span className="col__config__text">
                {groupField ? `分组：${groupField.label}` : '分组'}
              </span>
            </button>
            <button
              type="button"
              className={`col__config ${managing ? 'col__config--on' : ''}`}
              aria-expanded={managing}
              onClick={() => setManaging((value) => !value)}
            >
              字段
            </button>
          </div>
        </div>
        <span className="col__sublabel">简历投递进度</span>
        <div className="col__progress col__progress--resident">
          <span className="col__count">
            {todos.length} 家公司在跟进
            {groups ? ` · ${groups.length} 组` : ''}
          </span>
        </div>
      </header>

      {grouping && (
        <div className="groupset" ref={groupPanelRef}>
          <div className="groupset__head">
            <span>按字段值分组</span>
            <span className="groupset__hint">只影响这一列</span>
          </div>
          <button
            type="button"
            className={`groupset__opt ${groupField ? '' : 'groupset__opt--on'}`}
            onClick={() => chooseGroup(null)}
          >
            不分组
          </button>
          {textFields.map((field) => (
            <button
              type="button"
              key={field.key}
              className={`groupset__opt ${groupField?.key === field.key ? 'groupset__opt--on' : ''}`}
              onClick={() => chooseGroup(field.key)}
            >
              {field.label}
            </button>
          ))}
          {textFields.length === 0 && (
            <p className="groupset__empty">还没有文本字段，先在「字段」里添加</p>
          )}
        </div>
      )}

      {managing && (
        <FieldManager
          fields={fields}
          hint="只对本列卡片生效"
          onAdd={(field) => onFieldAdd(columnKey, field)}
          onUpdate={(key, patch) => onFieldUpdate(columnKey, key, patch)}
          onRemove={(key) => onFieldRemove(columnKey, key)}
        />
      )}

      <div className="col__list">
        {groups
          ? groups.map((group) => (
              <div className="resident-group" key={group.key}>
                <div className="resident-group__head">
                  <span
                    className={`resident-group__label ${
                      group.empty ? 'resident-group__label--empty' : ''
                    }`}
                  >
                    {group.label}
                  </span>
                  <span className="resident-group__count">{group.todos.length}</span>
                </div>
                {renderItems(group.todos)}
              </div>
            ))
          : renderItems(todos)}
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
