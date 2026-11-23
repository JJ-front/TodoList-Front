import { useState } from 'react'
import { IconClose, IconPlus } from './Icons.jsx'
import { makeFieldKey } from '../lib/fields.js'

export default function FieldManager({ fields, hint = '对所有卡片生效', onAdd, onUpdate, onRemove }) {
  const [focusKey, setFocusKey] = useState(null)

  const handleAdd = () => {
    const key = makeFieldKey()
    onAdd({ key, label: '新字段', type: 'text' })
    setFocusKey(key)
  }

  return (
    <div className="fields">
      <div className="fields__head">
        <span>自定义字段</span>
        <span className="fields__hint">{hint}</span>
      </div>

      {fields.map((field) => (
        <div className="field" key={field.key}>
          <input
            className="field__label"
            value={field.label}
            placeholder="字段名"
            autoFocus={focusKey === field.key}
            onChange={(e) => onUpdate(field.key, { label: e.target.value })}
            onBlur={() => {
              if (!field.label.trim()) onUpdate(field.key, { label: '未命名字段' })
            }}
          />
          <button
            type="button"
            className={`field__type ${field.type === 'link' ? 'field__type--link' : ''}`}
            title="切换字段类型：文本 / 链接"
            onClick={() =>
              onUpdate(field.key, { type: field.type === 'link' ? 'text' : 'link' })
            }
          >
            {field.type === 'link' ? '链接' : '文本'}
          </button>
          <button
            type="button"
            className="field__del"
            aria-label={`删除字段「${field.label}」`}
            onClick={() => onRemove(field.key)}
          >
            <IconClose size={10} />
          </button>
        </div>
      ))}

      {fields.length === 0 && (
        <p className="fields__empty">还没有字段，卡片只显示任务标题</p>
      )}

      <button type="button" className="fields__add" onClick={handleAdd}>
        <IconPlus size={10} />
        <span>添加字段</span>
      </button>
    </div>
  )
}
