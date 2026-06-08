import Badge from './Badge'

const STATUS_COLOR = {
  Done:    'green',
  Todo:    'gray',
  Blocked: 'red',
  Doing:   'blue',
}

const STATUS_LABEL = {
  Done:    '完成',
  Todo:    '待辦',
  Blocked: '卡關',
  Doing:   '進行中',
}

export default function StatusTag({ status }) {
  return (
    <Badge color={STATUS_COLOR[status] ?? 'gray'}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
