import Badge from './Badge'

const PRIORITY_COLOR = {
  High:   'red',
  Medium: 'yellow',
  Low:    'gray',
}

const PRIORITY_LABEL = {
  High:   '高',
  Medium: '中',
  Low:    '低',
}

export default function PriorityTag({ priority }) {
  if (!priority) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
  return (
    <Badge color={PRIORITY_COLOR[priority] ?? 'gray'}>
      {PRIORITY_LABEL[priority] ?? priority}
    </Badge>
  )
}
