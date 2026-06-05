import Badge from './Badge'

const STATUS_COLOR = {
  Done:    'green',
  Todo:    'gray',
  Blocked: 'red',
}

const STATUS_LABEL = {
  Done:    '完成',
  Todo:    '待辦',
  Blocked: '卡關',
}

export default function StatusTag({ status }) {
  return (
    <Badge color={STATUS_COLOR[status] ?? 'gray'}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
