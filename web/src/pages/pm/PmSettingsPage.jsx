import { useState } from 'react'
import { useProjects } from '../../hooks/useProjects.js'
import {
  useProjectMembers,
  useInviteUser,
  useRemoveMember,
} from '../../hooks/useTeamManagement.js'
import Spinner from '../../components/atoms/Spinner.jsx'
import ErrorMessage from '../../components/atoms/ErrorMessage.jsx'
import Navbar from '../../components/organisms/Navbar.jsx'

const ROLE_LABEL = { admin: 'Admin（PM）', developer: '工程師', viewer: '客戶' }
const ROLE_COLOR = {
  admin: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  developer: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  viewer: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

const INPUT = 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function InviteForm({ projectId }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('developer')
  const { mutate, isPending, error, isSuccess, reset } = useInviteUser(projectId)

  function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    mutate({ email, role }, {
      onSuccess: () => { setEmail(''); setTimeout(reset, 3000) },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="對方的 Email（需先登入過一次）"
        required
        className={`flex-1 min-w-48 ${INPUT}`}
      />
      <select value={role} onChange={e => setRole(e.target.value)} className={INPUT}>
        <option value="admin">Admin（PM）</option>
        <option value="developer">工程師</option>
        <option value="viewer">客戶</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {isPending ? '邀請中...' : '+ 邀請'}
      </button>
      {isSuccess && <p className="w-full text-sm text-green-600">已成功邀請！</p>}
      {error && <p className="w-full text-sm text-red-600">{error.message}</p>}
    </form>
  )
}

function MemberRow({ member, projectId }) {
  const { mutate, isPending } = useRemoveMember(projectId)
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
      <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{member.email}</td>
      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{member.full_name || '—'}</td>
      <td className="py-3 px-4">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLOR[member.role]}`}>
          {ROLE_LABEL[member.role]}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-400 dark:text-gray-500">
        {new Date(member.joined_at).toLocaleDateString('zh-TW')}
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => mutate(member.user_id)}
          disabled={isPending}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition"
        >
          移除
        </button>
      </td>
    </tr>
  )
}

export default function PmSettingsPage() {
  const { data: projects, isLoading: loadingProjects } = useProjects()
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  const projectId = selectedProjectId || projects?.[0]?.id || null
  const { data: members, isLoading: loadingMembers, error } = useProjectMembers(projectId)

  if (loadingProjects) return <><Navbar /><div className="p-8"><Spinner /></div></>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">成員管理</h1>
          {projects && projects.length > 1 && (
            <select
              value={projectId || ''}
              onChange={e => setSelectedProjectId(e.target.value)}
              className={INPUT}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">邀請新成員</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">對方需先用 Magic Link 或 Google 登入過一次，才能被邀請。</p>
          {projectId
            ? <InviteForm projectId={projectId} />
            : <p className="text-sm text-gray-400 dark:text-gray-500">請先建立專案</p>
          }
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">現有成員</h2>
          </div>
          {loadingMembers ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : error ? (
            <div className="p-4"><ErrorMessage message={error.message} /></div>
          ) : members?.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 dark:text-gray-500 text-center">尚無成員</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">姓名</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">角色</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">加入日期</th>
                  <th className="py-2 px-4" />
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <MemberRow key={m.user_id} member={m} projectId={projectId} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
