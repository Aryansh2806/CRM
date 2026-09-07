import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import useAuth from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import LeadsList from './pages/leads/LeadsList'
import ClientsList from './pages/clients/ClientsList'
import ProjectsList from './pages/projects/ProjectsList'
import TasksList from './pages/tasks/TasksList'
import UsersList from './pages/users/UsersList'
import Profile from './pages/profile/Profile'
import Analytics from './pages/analytics/Analytics'
import LoadingSpinner from './components/ui/LoadingSpinner'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner fullPage />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingSpinner fullPage />

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<LeadsList />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="projects" element={<ProjectsList />} />
        <Route path="tasks" element={<TasksList />} />
        <Route path="users" element={<UsersList />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
