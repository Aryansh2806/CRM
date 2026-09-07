import { useState, useEffect, useCallback } from 'react'
import { Plus, List, LayoutGrid, Pencil, Trash2, ChevronDown } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Table from '../../components/ui/Table'
import api from '../../api/axios'
import useAuth from '../../hooks/useAuth'
import { format } from 'date-fns'

const COLUMNS = [
  { id: 'todo', label: 'Todo', color: 'bg-gray-100 border-gray-200' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50 border-blue-200' },
  { id: 'review', label: 'Review', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'done', label: 'Done', color: 'bg-green-50 border-green-200' },
]

const empty = { title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '', project: '' }

function TaskForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? {
    ...empty, ...initial,
    assigned_to: initial.assigned_to?._id || initial.assigned_to || '',
    project: initial.project?._id || initial.project || '',
    due_date: initial.due_date ? initial.due_date.slice(0, 10) : '',
  } : { ...empty })
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data?.users || r.data || [])).catch(() => {})
    api.get('/projects').then(r => setProjects(r.data?.projects || r.data || [])).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.assigned_to) delete payload.assigned_to
      if (!payload.project) delete payload.project
      if (!payload.due_date) delete payload.due_date
      if (initial?._id) { await api.put(`/tasks/${initial._id}`, payload) }
      else { await api.post('/tasks', payload) }
      onSave()
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="form-label">Title *</label>
          <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" />
        </div>
        <div className="col-span-2">
          <label className="form-label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What needs to be done…" />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {['todo','in_progress','review','done'].map(s => <option key={s} value={s}>{s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Priority</label>
          <select className="input-field" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Assigned To</label>
          <select className="input-field" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Due Date</label>
          <input type="date" className="input-field" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="form-label">Project</label>
          <select className="input-field" value={form.project} onChange={e => set('project', e.target.value)}>
            <option value="">No project</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 text-gray-400 hover:text-primary-600 rounded" onClick={() => onEdit(task)}><Pencil size={13} /></button>
          <button className="p-1 text-gray-400 hover:text-red-500 rounded" onClick={() => onDelete(task)}><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge status={task.priority} />
        {task.assigned_to?.name && (
          <span className="text-xs text-gray-500">{task.assigned_to.name}</span>
        )}
        {task.due_date && (
          <span className="text-xs text-gray-400 font-mono ml-auto">
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
      <div className="mt-2 relative">
        <button
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          Move to <ChevronDown size={11} />
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 w-36">
            {COLUMNS.map(col => col.id !== task.status && (
              <button
                key={col.id}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                onClick={() => { onStatusChange(task._id, col.id); setMenuOpen(false) }}
              >
                {col.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksList() {
  const { hasRole } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const canEdit = hasRole('super_admin', 'director', 'manager', 'employee')

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/tasks')
      setTasks(res.data?.tasks || res.data || [])
    } catch { setTasks([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/tasks/${id}`, { status: newStatus })
      setTasks(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t))
    } catch {}
  }

  const handleDelete = async (id) => {
    await api.delete(`/tasks/${id}`)
    setDeleteConfirm(null)
    fetchTasks()
  }

  const tableColumns = [
    { key: 'title', label: 'Task', render: row => <p className="font-medium text-gray-900">{row.title}</p> },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'priority', label: 'Priority', render: row => <Badge status={row.priority} /> },
    { key: 'assigned_to', label: 'Assignee', render: row => row.assigned_to?.name || '—' },
    { key: 'due_date', label: 'Due', render: row => row.due_date ? format(new Date(row.due_date), 'MMM d, yyyy') : '—' },
    { key: 'project', label: 'Project', render: row => row.project?.title || '—' },
  ]

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('board')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'board' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={15} /> Board
          </button>
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <List size={15} /> List
          </button>
        </div>
        {canEdit && (
          <button className="btn-primary flex-shrink-0" onClick={() => setModal('add')}>
            <Plus size={16} /> Add Task
          </button>
        )}
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id)
            return (
              <div key={col.id} className={`rounded-xl border ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{col.label}</h3>
                  <span className="text-xs font-bold text-gray-500 bg-white rounded-full px-2 py-0.5 border border-gray-200">{colTasks.length}</span>
                </div>
                {loading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                  </div>
                ) : colTasks.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                ) : (
                  <div className="space-y-2">
                    {colTasks.map(task => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onEdit={setModal}
                        onDelete={setDeleteConfirm}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="card p-0 overflow-hidden">
          <Table
            columns={tableColumns} data={tasks} loading={loading}
            emptyMessage="No tasks found."
            actions={canEdit ? (row) => (
              <>
                <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" onClick={() => setModal(row)}><Pencil size={15} /></button>
                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" onClick={() => setDeleteConfirm(row)}><Trash2 size={15} /></button>
              </>
            ) : null}
          />
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Task' : `Edit Task`} size="lg" onClose={() => setModal(null)}>
          <TaskForm initial={modal === 'add' ? null : modal} onSave={() => { setModal(null); fetchTasks() }} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Task" size="sm" onClose={() => setDeleteConfirm(null)}>
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
