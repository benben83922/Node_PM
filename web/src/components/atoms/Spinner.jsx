export default function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size] ?? 'h-6 w-6'
  return (
    <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${sz} ${className}`} role="status" aria-label="載入中" />
  )
}
