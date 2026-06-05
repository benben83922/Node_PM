export default function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
      {message}
    </div>
  )
}
