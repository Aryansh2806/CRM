import { useState, useEffect } from 'react'
import { Target, Building2, FolderKanban, CheckSquare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import StatsCard from '../../components/ui/StatsCard'
import api from '../../api/axios'
import useAuth from '../../hooks/useAuth'
import { format } from 'date-fns'

const mockStats = { leads: 42, clients: 18, projects: 11, tasks: 67 }
const mockLeadsByStatus = [
  { status: 'New', count: 12 },
  { status: 'Contacted', count: 9 },
  { status: 'Qualified', count: 8 },
  { status: 'Proposal', count: 6 },
  { status: 'Won', count: 5 },
  { status: 'Lost', count: 2 },
]
const mockTasksByStatus = [
  { name: 'Todo', value: 23, color: '#94a3b8' },
  { name: 'In Progress', value: 19, color: '#3b82f6' },
  { name: 'Review', value: 12, color: '#f59e0b' },
  { name: 'Done', value: 13, color: '#22c55e' },
]
const mockActivity = [
  { id: 1, text: 'Lead "Acme Corp" moved to Proposal', time: new Date(Date.now() - 10 * 60000) },
  { id: 2, text: 'Task "API integration" marked Done', time: new Date(Date.now() - 45 * 60000) },
  { id: 3, text: 'New client "TechStart Inc" added', time: new Date(Date.now() - 2 * 3600000) },
  { id: 4, text: 'Project "Portal v2" status updated', time: new Date(Date.now() - 5 * 3600000) },
  { id: 5, text: 'Lead "NovaSoft" marked Won', time: new Date(Date.now() - 8 * 3600000) },
]

const greetings = {
  super_admin: 'Welcome back, Admin.',
  director: 'Here's your team overview.',
  manager: 'Here's your pipeline summary.',
  employee: 'Here's what's on your plate today.',
  hr_finance: 'Here's today's workforce snapshot.',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [leadsByStatus, setLeadsByStatus] = useState(mockLeadsByStatus)
  const [tasksByStatus] = useState(mockTasksByStatus)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(res => {
        const d = res.data
        setStats(d.stats || mockStats)
        if (d.leadsByStatus) setLeadsByStatus(d.leadsByStatus)
      })
      .catch(() => setStats(mockStats))
      .finally(() => setLoading(false))
  }, [])

  const s = stats || mockStats

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {greetings[user?.role] || 'Welcome back.'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Target} label="Total Leads" value={s.leads} trend={8} color="blue" />
        <StatsCard icon={Building2} label="Active Clients" value={s.clients} trend={3} color="green" />
        <StatsCard icon={FolderKanban} label="Projects" value={s.projects} trend={-2} color="orange" />
        <StatsCard icon={CheckSquare} label="Open Tasks" value={s.tasks} trend={12} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Leads by status */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Leads by Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leadsByStatus} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by status */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={tasksByStatus}
                cx="50%"
                cy="45%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={3}
                dataKey="value"
              >
                {tasksByStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Recent Activity</h3>
        <ul className="divide-y divide-gray-100">
          {mockActivity.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item.text}</span>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {format(item.time, 'h:mm a')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
