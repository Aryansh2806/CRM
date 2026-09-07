import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Target, Building2, FolderKanban,
  CheckSquare, BarChart3, User, LogOut, Zap, X
} from 'lucide-react'
import useAuth from '../../hooks/useAuth'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin','director','manager','employee','hr_finance'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['super_admin','director','manager','hr_finance'] },
  { to: '/leads', icon: Target, label: 'Leads', roles: ['super_admin','director','manager','employee'] },
  { to: '/clients', icon: Building2, label: 'Clients', roles: ['super_admin','director','manager'] },
  { to: '/projects', icon: FolderKanban, label: 'Projects', roles: ['super_admin','director','manager'] },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks', roles: ['super_admin','director','manager','employee'] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['super_admin','director','hr_finance'] },
  { to: '/profile', icon: User, label: 'Profile', roles: ['super_admin','director','manager','employee','hr_finance'] },
]

const subLabels = {
  '/users': { manager: 'My Team', hr_finance: 'Employees', director: 'Team', super_admin: 'Users' },
  '/tasks': { employee: 'My Tasks' },
  '/leads': { employee: 'My Leads' },
  '/analytics': { hr_finance: 'HR Reports' },
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const role = user?.role

  const visibleItems = navItems.filter(item => item.roles.includes(role))

  const getLabel = (item) => {
    const map = subLabels[item.to]
    return (map && map[role]) || item.label
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-60 bg-gray-950 flex flex-col transition-transform duration-200
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">NexaCRM</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <item.icon size={17} className="flex-shrink-0" />
              {getLabel(item)}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
