import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import api from '../../api/axios'
import useAuth from '../../hooks/useAuth'

const empty = {
  name: '', email: '', company: '', domain: '', status: 'active',
  total_value: '', account_manager: '', phone: '', address: ''
}

function ClientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...empty, ...initial, account_manager: initial.account_manager?._id || initial.account_manager || '' } : { ...empty })
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data?.users || res.data || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    try {
      const payload = { ...form, total_value: form.total_value ? Number(form.total_value) : undefined }
      if (!payload.account_manager) delete payload.account_manager
      if (initial?._id) { await api.put(`/clients/${initial._id}`, payload) }
      else { await api.post('/clients', payload) }
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
        <div>
          <label className="form-label">Name *</label>
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Client name" />
        </div>
        <div>
          <label className="form-label">Company</label>
          <input className="input-field" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
        </div>
        <div>
          <label className="form-label">Email</label>
          <input type="email" className="input-field" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@client.com" />
        </div>
        <div>
          <label className="form-label">Phone</label>
          <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
        </div>
        <div>
          <label className="form-label">Domain</label>
          <input className="input-field" value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="e.g. Healthcare" />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <div>
          <label className="form-label">Total Value ($)</label>
          <input type="number" className="input-field" value={form.total_value} onChange={e => set('total_value', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="form-label">Account Manager</label>
          <select className="input-field" value={form.account_manager} onChange={e => set('account_manager', e.target.value)}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="form-label">Address</label>
          <input className="input-field" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, City, Country" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Client'}
        </button>
      </div>
    </form>
  )
}

export default function ClientsList() {
  const { hasRole } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const canEdit = hasRole('super_admin', 'director', 'manager')

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/clients', { params: search ? { search } : {} })
      setClients(res.data?.clients || res.data || [])
    } catch { setClients([]) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchClients() }, [fetchClients])

  const handleDelete = async (id) => {
    await api.delete(`/clients/${id}`)
    setDeleteConfirm(null)
    fetchClients()
  }

  const columns = [
    {
      key: 'name', label: 'Client',
      render: row => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.company || row.email || ''}</p>
        </div>
      )
    },
    { key: 'email', label: 'Email', render: row => <span className="text-gray-600">{row.email || '—'}</span> },
    { key: 'domain', label: 'Domain', render: row => row.domain || '—' },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'total_value', label: 'Total Value', render: row => row.total_value ? `$${Number(row.total_value).toLocaleString()}` : '—' },
    { key: 'account_manager', label: 'Account Mgr', render: row => row.account_manager?.name || '—' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-8 w-56" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canEdit && (
          <button className="btn-primary flex-shrink-0" onClick={() => setModal('add')}>
            <Plus size={16} /> Add Client
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <Table
          columns={columns} data={clients} loading={loading}
          emptyMessage="No clients found."
          actions={canEdit ? (row) => (
            <>
              <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" onClick={() => setModal(row)}><Pencil size={15} /></button>
              <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" onClick={() => setDeleteConfirm(row)}><Trash2 size={15} /></button>
            </>
          ) : null}
        />
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Client' : `Edit — ${modal.name}`} size="lg" onClose={() => setModal(null)}>
          <ClientForm initial={modal === 'add' ? null : modal} onSave={() => { setModal(null); fetchClients() }} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Client" size="sm" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-5">Delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
