import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import api from '../../api/axios'
import useAuth from '../../hooks/useAuth'
import { format } from 'date-fns'

const empty = {
  title: '', description: '', status: 'planning', priority: 'medium',
  start_date: '', end_date: '', manager: '', client: ''
}

function ProjectForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? {
    ...empty, ...initial,
    manager: initial.manager?._id || initial.manager || '',
    client: initial.client?._id || initial.client || '',
    start_date: initial.start_date ? initial.start_date.slice(0, 10) : '',
    end_date: initial.end_date ? initial.end_date.slice(0, 10) : '',
  } : { ...empty })
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data?.users || r.data || [])).catch(() => {})
    api.get('/clients').then(r => setClients(r.data?.clients || r.data || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.manager) delete payload.manager
      if (!payload.client) delete payload.client
      if (!payload.start_date) delete payload.start_date
      if (!payload.end_date) delete payload.end_date
      if (initial?._id) { await api.put(`/projects/${initial._id}`, payload) }
      else { await api.post('/projects', payload) }
      onSave()
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="form-label">Title *</label>
          <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Project title" />
        </div>
        <div className="col-span-2">
          <label className="form-label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Project scope and objectives…" />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {['planning','active','on_hold','completed','cancelled'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Priority</label>
          <select className="input-field" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {['low','medium','high','critical'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Start Date</label>
          <input type="date" className="input-field" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="form-label">End Date</label>
          <input type="date" className="input-field" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Project Manager</label>
          <select className="input-field" value={form.manager} onChange={e => set('manager', e.target.value)}>
            <option value="">Select manager</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Client</label>
          <select className="input-field" value={form.client} onChange={e => set('client', e.target.value)}>
            <option value="">Select client</option>
            {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Project'}
        </button>
      </div>
    </form>
  )
}

export default function ProjectsList() {
  const { hasRole } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const canEdit = hasRole('super_admin', 'director', 'manager')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/projects', { params: search ? { search } : {} })
      setProjects(res.data?.projects || res.data || [])
    } catch { setProjects([]) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async (id) => {
    await api.delete(`/projects/${id}`)
    setDeleteConfirm(null)
    fetch()
  }

  const columns = [
    {
      key: 'title', label: 'Project',
      render: row => <p className="font-medium text-gray-900">{row.title}</p>
    },
    { key: 'client', label: 'Client', render: row => row.client?.name || '—' },
    { key: 'domain', label: 'Domain', render: row => row.domain || '—' },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'priority', label: 'Priority', render: row => <Badge status={row.priority} /> },
    { key: 'manager', label: 'Manager', render: row => row.manager?.name || '—' },
    {
      key: 'start_date', label: 'Dates',
      render: row => (
        <span className="text-xs text-gray-500 font-mono">
          {row.start_date ? format(new Date(row.start_date), 'MMM d') : '—'}
          {row.end_date ? ` → ${format(new Date(row.end_date), 'MMM d, yyyy')}` : ''}
        </span>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-8 w-56" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canEdit && (
          <button className="btn-primary flex-shrink-0" onClick={() => setModal('add')}>
            <Plus size={16} /> Add Project
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <Table
          columns={columns} data={projects} loading={loading}
          emptyMessage="No projects found."
          actions={canEdit ? (row) => (
            <>
              <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" onClick={() => setModal(row)}><Pencil size={15} /></button>
              <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" onClick={() => setDeleteConfirm(row)}><Trash2 size={15} /></button>
            </>
          ) : null}
        />
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Project' : `Edit — ${modal.title}`} size="lg" onClose={() => setModal(null)}>
          <ProjectForm initial={modal === 'add' ? null : modal} onSave={() => { setModal(null); fetch() }} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Project" size="sm" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-5">Delete <strong>{deleteConfirm.title}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
