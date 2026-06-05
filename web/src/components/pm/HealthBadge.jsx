import { HEALTH_LABEL } from '../../lib/healthCalc'

const CONFIG = {
  normal:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  warning:  { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  critical: { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
}

export default function HealthBadge({ status }) {
  const cfg = CONFIG[status] ?? CONFIG.normal
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {HEALTH_LABEL[status]}
    </span>
  )
}
