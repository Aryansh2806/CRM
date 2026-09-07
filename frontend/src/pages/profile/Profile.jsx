import { useState } from 'react'
import { User, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../../api/axios'
import useAuth from '../../hooks/useAuth'

function Alert({ type, msg }) {
  if (!msg) return null
  const isError = type === 'error'
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg text-sm ${isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
      {isError ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> : <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
      {msg}
    </div>
  )
}

export default function Profile() {
  const { user, login } = useAuth()
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [profileState, setProfileState] = useState({ loading: false, msg: '', type: '' })

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwState, setPwState] = useState({ loading: false, msg: '', type: '' })

  const handleProfile = async (e) => {
    e.preventDefault()
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileState({ loading: false, msg: 'Name and email are required.', type: 'error' }); return
    }
    setProfileState({ loading: true, msg: '', type: '' })
    try {
      await api.put('/auth/profile', profileForm)
      setProfileState({ loading: false, msg: 'Profile updated successfully.', type: 'success' })
    } catch (err) {
      setProfileState({ loading: false, msg: err.response?.data?.message || 'Update failed.', type: 'error' })
    }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (!pwForm.current_password || !pwForm.new_password) {
      setPwState({ loading: false, msg: 'All fields are required.', type: 'error' }); return
    }
    if (pwForm.new_password !== pwForm.confirm) {
      setPwState({ loading: false, msg: 'New passwords do not match.', type: 'error' }); return
    }
    if (pwForm.new_password.length < 6) {
      setPwState({ loading: false, msg: 'Password must be at least 6 characters.', type: 'error' }); return
    }
    setPwState({ loading: true, msg: '', type: '' })
    try {
      await api.put('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      })
      setPwForm({ current_password: '', new_password: '', confirm: '' })
      setPwState({ loading: false, msg: 'Password changed successfully.', type: 'success' })
    } catch (err) {
      setPwState({ loading: false, msg: err.response?.data?.message || 'Password change failed.', type: 'error' })
    }
  }

  const roleBadge = (role) => {
    const labels = { super_admin: 'Super Admin', director: 'Director', manager: 'Manager', employee: 'Employee', hr_finance: 'HR / Finance' }
    return labels[role] || role
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
            <p className="text-sm text-gray-500">Update your name and email address.</p>
          </div>
        </div>

        {/* Role pill */}
        <div className="flex items-center gap-2 mb-5 pb-5 border-b border-gray-100">
          <span className="text-sm text-gray-500">Role:</span>
          <span className="text-sm font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
            {roleBadge(user?.role)}
          </span>
        </div>

        <form onSubmit={handleProfile} className="space-y-4">
          <Alert type={profileState.type} msg={profileState.msg} />
          <div>
            <label className="form-label">Full Name</label>
            <input
              className="input-field"
              value={profileForm.name}
              onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              value={profileForm.email}
              onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@company.com"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={profileState.loading} className="btn-primary">
              {profileState.loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
            <p className="text-sm text-gray-500">Use a strong, unique password.</p>
          </div>
        </div>

        <form onSubmit={handlePassword} className="space-y-4">
          <Alert type={pwState.type} msg={pwState.msg} />
          <div>
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="input-field"
              value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="input-field"
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="input-field"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={pwState.loading} className="btn-primary">
              {pwState.loading ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
