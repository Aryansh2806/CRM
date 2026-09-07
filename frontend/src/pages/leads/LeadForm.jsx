import { useState, useEffect } from 'react'
import api from '../../api/axios'

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

const empty = {
  title: '', company_name: '', contact_name: '', contact_email: '',
  contact_phone: '', status: 'new', value: '', assigned_to: '', notes: ''
}

export default function LeadForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...empty, ...initial, assigned_to: initial.assigned_to?._id || initial.assigned_to || '' } : { ...empty })
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data?.users || res.data || [])).catch(() => {})
  }, [])

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.company_name.trim()) e.company_name = 'Company is required'
    return e
  }

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const payload = { ...form, value: form.value ? Number(form.value) : undefined }
      if (!payload.assigned_to) delete payload.assigned_to
      if (initial?._id) {
        await api.put(`/leads/${initial._id}`, payload)
      } else {
        await api.post('/leads', payload)
      }
      onSave()
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Save failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._global && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{errors._global}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="form-label">Lead Title *</label>
          <input className={`input-field ${errors.title ? 'border-red-400' : ''}`} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. ERP Implementation" />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>
        <div>
          <label className="form-label">Company *</label>
          <input className={`input-field ${errors.company_name ? 'border-red-400' : ''}`} value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Acme Corp" />
          {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name}</p>}
        </div>
        <div>
          <label className="form-label">Contact Name</label>
          <input className="input-field" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Jane Smith" />
        </div>
        <div>
          <label className="form-label">Contact Email</label>
          <input type="email" className="input-field" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="jane@acme.com" />
        </div>
        <div>
          <label className="form-label">Contact Phone</label>
          <input className="input-field" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+1 555 000 0000" />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Estimated Value ($)</label>
          <input type="number" min="0" className="input-field" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0" />
        </div>
        <div className="col-span-2">
          <label className="form-label">Assigned To</label>
          <select className="input-field" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="form-label">Notes</label>
          <textarea className="input-field resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional context…" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Lead'}
        </button>
      </div>
    </form>
  )
}
