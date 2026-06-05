import { useNavigate } from 'react-router-dom'
import Button from '../components/atoms/Button'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <p className="text-5xl font-bold text-gray-200">403</p>
        <h1 className="text-lg font-semibold text-gray-800">無權限存取</h1>
        <p className="text-sm text-gray-500">您的帳號無法存取此頁面。</p>
        <Button onClick={() => navigate(-1)}>返回上頁</Button>
      </div>
    </div>
  )
}
