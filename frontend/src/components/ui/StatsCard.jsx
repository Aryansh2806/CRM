import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatsCard({ icon: Icon, label, value, trend, trendLabel, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-teal-50 text-teal-600',
  }
  const iconCls = colorMap[color] || colorMap.blue

  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${iconCls} flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 font-mono tabular-nums">{value ?? '—'}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{Math.abs(trend)}% {trendLabel || 'vs last month'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
