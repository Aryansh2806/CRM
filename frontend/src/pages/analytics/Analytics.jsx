import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList, Cell
} from 'recharts'
import api from '../../api/axios'

const mockMonthly = [
  { month: 'Apr', leads: 8, won: 2 },
  { month: 'May', leads: 14, won: 3 },
  { month: 'Jun', leads: 11, won: 4 },
  { month: 'Jul', leads: 19, won: 6 },
  { month: 'Aug', leads: 16, won: 5 },
  { month: 'Sep', leads: 22, won: 7 },
]

const mockTeam = [
  { name: 'Alex K.', tasks_completed: 18, leads_won: 4 },
  { name: 'Sarah M.', tasks_completed: 24, leads_won: 6 },
  { name: 'Dev P.', tasks_completed: 15, leads_won: 3 },
  { name: 'Jen T.', tasks_completed: 21, leads_won: 5 },
  { name: 'Omar F.', tasks_completed: 12, leads_won: 2 },
]

const mockFunnel = [
  { name: 'New', value: 120, fill: '#3b82f6' },
  { name: 'Contacted', value: 86, fill: '#6366f1' },
  { name: 'Qualified', value: 52, fill: '#f59e0b' },
  { name: 'Proposal', value: 31, fill: '#f97316' },
  { name: 'Won', value: 18, fill: '#22c55e' },
]

export default function Analytics() {
  const [monthly, setMonthly] = useState(mockMonthly)
  const [team, setTeam] = useState(mockTeam)
  const [funnel, setFunnel] = useState(mockFunnel)

  useEffect(() => {
    api.get('/analytics/leads-monthly').then(r => { if (r.data?.length) setMonthly(r.data) }).catch(() => {})
    api.get('/analytics/team-performance').then(r => { if (r.data?.length) setTeam(r.data) }).catch(() => {})
    api.get('/analytics/leads-funnel').then(r => { if (r.data?.length) setFunnel(r.data) }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {/* Row 1: Line chart + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Leads over time */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Leads Pipeline — Last 6 Months</h3>
          <p className="text-xs text-gray-400 mb-4">Total new leads and wins per month</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} name="New Leads" />
              <Line type="monotone" dataKey="won" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e' }} name="Won" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Leads funnel */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Conversion Funnel</h3>
          <p className="text-xs text-gray-400 mb-4">Lead stage breakdown</p>
          <div className="space-y-2">
            {funnel.map((stage, i) => {
              const pct = Math.round((stage.value / funnel[0].value) * 100)
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{stage.name}</span>
                    <span className="text-gray-500 font-mono tabular-nums">{stage.value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: stage.fill }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Overall conversion</p>
            <p className="text-xl font-bold text-gray-900 font-mono tabular-nums">
              {funnel[0]?.value ? Math.round((funnel[funnel.length - 1].value / funnel[0].value) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Team performance */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Team Performance</h3>
        <p className="text-xs text-gray-400 mb-4">Tasks completed and leads won per team member</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={team} barGap={4} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="tasks_completed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Tasks Completed" />
            <Bar dataKey="leads_won" fill="#22c55e" radius={[4, 4, 0, 0]} name="Leads Won" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads (6mo)', value: monthly.reduce((s, m) => s + m.leads, 0) },
          { label: 'Total Won (6mo)', value: monthly.reduce((s, m) => s + m.won, 0) },
          { label: 'Avg Win Rate', value: `${Math.round((monthly.reduce((s, m) => s + m.won, 0) / Math.max(monthly.reduce((s, m) => s + m.leads, 0), 1)) * 100)}%` },
          { label: 'Team Members', value: team.length },
        ].map((tile, i) => (
          <div key={i} className="card">
            <p className="text-xs text-gray-500 font-medium">{tile.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
