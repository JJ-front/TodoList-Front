/** 统一把界面图标画成 SVG：文本字形在不同字体里基线不同，容易看起来偏上/偏下 */
export function IconCheck({ size = 12, strokeWidth = 2.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.2 8.4l3.1 3.1 6.5-6.9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconChevron({ dir = 'left', size = 14, strokeWidth = 2 }) {
  const d = dir === 'left' ? 'M9.9 3.4L5.3 8l4.6 4.6' : 'M6.1 3.4L10.7 8l-4.6 4.6'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconPlus({ size = 12, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 3.6v8.8M3.6 8h8.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconClose({ size = 12, strokeWidth = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.4 4.4l7.2 7.2M11.6 4.4l-7.2 7.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}
