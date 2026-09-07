import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import LeadForm from './LeadForm'
import api from '../../api/axios'
import useAuth from '../../hooks/useAuth'
import { format } from 'date-fns'

const STATUSES = ['', 'new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

export default function LeadsList() {
  const { hasRole } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null) // null | 'add' | lead obj
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const canEdit = hasRole('super_admin', 'director', 'manager')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search
      const res = await api.get('/leads', { params })
      setLeads(res.data?.leads || res.data || [])
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const handleDelete = async (id) => {
    await api.delete(`/leads/${id}`)
    setDeleteConfirm(null)
    fetchLeads()
  }

  const columns = [
    {
      key: 'title', label: 'Lead / Company',
      render: row => (
        <div>
          <p className="font-medium text-gray-900">{row.title}</p>
          <p className="text-xs text-gray-500">{row.company_name}</p>
        </div>
      )
    },
    {
      key: 'contact_name', label: 'Contact',
      render: row => (
        <div>
          <p className="text-gray-700">{row.contact_name || '—'}</p>
          <p className="text-xs text-gray-400">{row.contact_email || ''}</p>
        </div>
      )
    },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    {
      key: 'value', label: 'Value',
      render: row => row.value ? `$${row.value.toLocaleString()}` : '—'
    },
    {
      key: 'assigned_to', label: 'Assigned To',
      render: row => row.assigned_to?.name || '—'
    },
    {
      key: 'createdAt', label: 'Created',
      render: row => row.createdAt ? format(new Date(row.createdAt), 'MMM d, yyyy') : '—'
    },
  ]

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-8 w-56"
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field w-40"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}</option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button className="btn-primary flex-shrink-0" onClick={() => setModal('add')}>
            <Plus size={16} /> Add Lead
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <Table
          columns={columns}
          data={leads}
          loading={loading}
          emptyMessage="No leads found. Add your first lead to get started."
          actions={canEdit ? (row) => (
            <>
              <button
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                onClick={() => setModal(row)}
                aria-label="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                onClick={() => setDeleteConfirm(row)}
                aria-label="Delete"
              >
                <Trash2 size={15} />
              </button>
            </>
          ) : null}
        />
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'Add Lead' : `Edit Lead — ${modal.title}`}
          size="lg"
          onClose={() => setModal(null)}
        >
          <LeadForm
            initial={modal === 'add' ? null : modal}
            onSave={() => { setModal(null); fetchLeads() }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal title="Delete Lead" size="sm" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Delete <strong>{deleteConfirm.title}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
