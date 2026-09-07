import { useState, useEffect, useCallback } from 'react'
import { Plus, UserX, Search } from 'lucide-react'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import api from '../../api/axios'
import useAuth from '../../hooks/useAuth'

const ROLES = ['employee', 'manager', 'director', 'hr_finance', 'super_admin']

const emptyUser = { name: '', email: '', password: '', role: 'employee', domain: '', manager: '' }

function UserForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ ...emptyUser })
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/users').then(r => setManagers((r.data?.users || r.data || []).filter(u => ['manager','director','super_admin'].includes(u.role)))).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email and password are required.')
      return
    }
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.manager) delete payload.manager
      if (!payload.domain) delete payload.domain
      await api.post('/users', payload)
      onSave()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Full Name *</label>
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
        </div>
        <div>
          <label className="form-label">Email *</label>
          <input type="email" className="input-field" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" />
        </div>
        <div>
          <label className="form-label">Password *</label>
          <input type="password" className="input-field" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
        </div>
        <div>
          <label className="form-label">Role</label>
          <select className="input-field" value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Domain / Department</label>
          <input className="input-field" value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="e.g. Engineering" />
        </div>
        <div>
          <label className="form-label">Reports To</label>
          <select className="input-field" value={form.manager} onChange={e => set('manager', e.target.value)}>
            <option value="">None</option>
            {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating…' : 'Create User'}
        </button>
      </div>
    </form>
  )
}

export default function UsersList() {
  const { hasRole } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deactivateConfirm, setDeactivateConfirm] = useState(null)

  const canCreate = hasRole('super_admin')
  const canDeactivate = hasRole('super_admin', 'director')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/users', { params: search ? { search } : {} })
      setUsers(res.data?.users || res.data || [])
    } catch { setUsers([]) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleDeactivate = async (id) => {
    await api.put(`/users/${id}`, { status: 'inactive' })
    setDeactivateConfirm(null)
    fetchUsers()
  }

  const columns = [
    {
      key: 'name', label: 'User',
      render: row => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {row.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'role', label: 'Role', render: row => <Badge status={row.role} /> },
    { key: 'domain', label: 'Domain', render: row => row.domain || '—' },
    { key: 'manager', label: 'Reports To', render: row => row.manager?.name || '—' },
    {
      key: 'status', label: 'Status',
      render: row => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.status === 'inactive' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
          {row.status === 'inactive' ? 'Inactive' : 'Active'}
        </span>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-8 w-56" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canCreate && (
          <button className="btn-primary flex-shrink-0" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <Table
          columns={columns} data={users} loading={loading}
          emptyMessage="No users found."
          actions={canDeactivate ? (row) => (
            row.status !== 'inactive' ? (
              <button
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                onClick={() => setDeactivateConfirm(row)}
                title="Deactivate"
              >
                <UserX size={15} />
              </button>
            ) : <span className="text-xs text-gray-400 px-2">Inactive</span>
          ) : null}
        />
      </div>

      {showAdd && (
        <Modal title="Add User" size="lg" onClose={() => setShowAdd(false)}>
          <UserForm onSave={() => { setShowAdd(false); fetchUsers() }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {deactivateConfirm && (
        <Modal title="Deactivate User" size="sm" onClose={() => setDeactivateConfirm(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Deactivate <strong>{deactivateConfirm.name}</strong>? They will lose access to NexaCRM.
          </p>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setDeactivateConfirm(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => handleDeactivate(deactivateConfirm._id)}>Deactivate</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
