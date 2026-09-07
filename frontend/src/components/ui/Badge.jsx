const statusMap = {
  // Lead statuses
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-indigo-100 text-indigo-800',
  qualified: 'bg-yellow-100 text-yellow-800',
  proposal: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  // Client statuses
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-700',
  churned: 'bg-red-100 text-red-800',
  // Task statuses
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
  // Project statuses
  planning: 'bg-indigo-100 text-indigo-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  // Priority
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  // Roles
  super_admin: 'bg-purple-100 text-purple-800',
  director: 'bg-blue-100 text-blue-800',
  manager: 'bg-indigo-100 text-indigo-800',
  employee: 'bg-gray-100 text-gray-700',
  hr_finance: 'bg-teal-100 text-teal-800',
}

const labelMap = {
  in_progress: 'In Progress',
  hr_finance: 'HR / Finance',
  super_admin: 'Super Admin',
  on_hold: 'On Hold',
}

export default function Badge({ status, label }) {
  const cls = statusMap[status] || 'bg-gray-100 text-gray-700'
  const text = label || labelMap[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '—')
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${cls}`}>
      {text}
    </span>
  )
}
