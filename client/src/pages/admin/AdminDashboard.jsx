import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminService } from '../../services/adminService'
import Loading from '../../components/Loading'

export default function AdminDashboard({ navigate }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminService.getStats()
      setStats(data)
    } catch (err) {
      setError(err.message || 'Failed to load administrator statistics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <AdminLayout currentTab="dashboard" navigate={navigate}>
      <div className="admin-page-container">
        {/* Header */}
        <div className="admin-page-header">
          <div>
            <div className="admin-breadcrumbs">Administration / Overview</div>
            <h1 className="admin-page-title">Dashboard Overview</h1>
            <p className="admin-page-subtitle">
              Real-time platform metrics, user access levels, and task completion analytics.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={fetchStats}
            disabled={loading}
          >
            ↻ Refresh Data
          </button>
        </div>

        {error && (
          <div className="alert-banner" role="alert">
            <span>⚠ {error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
          </div>
        )}

        {loading ? (
          <div className="admin-loading-wrap">
            <Loading message="Fetching platform metrics…" />
          </div>
        ) : stats ? (
          <>
            {/* Stat Cards Grid */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Total Users</span>
                  <span className="admin-stat-badge users">Active: {stats.activeUsers}</span>
                </div>
                <div className="admin-stat-number">{stats.totalUsers}</div>
                <p className="admin-stat-desc">Registered platform accounts</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Total Admins</span>
                  <span className="admin-stat-badge admins">Privileged</span>
                </div>
                <div className="admin-stat-number">{stats.totalAdmins}</div>
                <p className="admin-stat-desc">Full system access permissions</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Total Todos</span>
                  <span className="admin-stat-badge todos">Global</span>
                </div>
                <div className="admin-stat-number">{stats.totalTodos}</div>
                <p className="admin-stat-desc">Created across all user accounts</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Completed Tasks</span>
                  <span className="admin-stat-badge completed">Done</span>
                </div>
                <div className="admin-stat-number">{stats.completedTodos}</div>
                <p className="admin-stat-desc">{stats.completionRate}% completion rate</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-label">Pending Tasks</span>
                  <span className="admin-stat-badge pending">In Progress</span>
                </div>
                <div className="admin-stat-number">{stats.pendingTodos}</div>
                <p className="admin-stat-desc">Awaiting user completion</p>
              </div>
            </div>

            {/* Platform Health & Progress Bar */}
            <div className="admin-progress-card">
              <div className="admin-progress-header">
                <div>
                  <h3 className="admin-card-heading">Global Productivity Health</h3>
                  <p className="admin-card-subheading">
                    {stats.totalTodos === 0
                      ? 'No tasks created on the platform yet.'
                      : `${stats.completedTodos} out of ${stats.totalTodos} tasks completed globally.`}
                  </p>
                </div>
                <span className="admin-progress-percent">{stats.completionRate}%</span>
              </div>
              <div className="progress-bar-track" role="progressbar" aria-valuenow={stats.completionRate} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`progress-bar-fill${stats.completionRate === 100 ? ' full' : ''}`}
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="admin-quick-actions-row">
              <div className="admin-action-card" onClick={() => navigate('/admin/users')}>
                <div className="admin-action-icon">👥</div>
                <div className="admin-action-info">
                  <h3>User Management</h3>
                  <p>Browse users, view roles, activate or deactivate accounts.</p>
                </div>
                <span className="admin-action-arrow">→</span>
              </div>

              <div className="admin-action-card" onClick={() => navigate('/admin/todos')}>
                <div className="admin-action-icon">📋</div>
                <div className="admin-action-info">
                  <h3>Task Moderation</h3>
                  <p>Review all tasks across the platform and manage content.</p>
                </div>
                <span className="admin-action-arrow">→</span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  )
}
