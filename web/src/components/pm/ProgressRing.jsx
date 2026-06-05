const SIZE = 80
const STROKE = 8
const R = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * R

export default function ProgressRing({ value = 0, label }) {
  const offset = CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} strokeWidth={STROKE}
          className="stroke-gray-200 fill-none" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-blue-500 fill-none transition-all duration-500" />
      </svg>
      <div className="-mt-14 flex flex-col items-center">
        <span className="text-xl font-bold text-gray-900">{value}%</span>
      </div>
      {label && <span className="text-xs text-gray-500 mt-8">{label}</span>}
    </div>
  )
}
