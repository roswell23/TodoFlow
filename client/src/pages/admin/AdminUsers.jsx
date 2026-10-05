import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminService } from '../../services/adminService'
import { useAuth } from '../../context/AuthContext'
import Loading from '../../components/Loading'

export default function AdminUsers({ navigate }) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal / Confirm state
  const [userToDelete, setUserToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminService.getUsers({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
      })
      setUsers(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch users.')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, roleFilter, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers()
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchUsers])

  const handleToggleStatus = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      setError('You cannot deactivate your own administrator account.')
      return
    }

    setUpdatingId(targetUser.id)
    setError('')
    setActionSuccess('')
    try {
      const nextStatus = !targetUser.isActive
      await adminService.toggleUserStatus(targetUser.id, nextStatus)
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: nextStatus } : u))
      )
      setActionSuccess(`User ${targetUser.name} has been ${nextStatus ? 'activated' : 'deactivated'}.`)
    } catch (err) {
      setError(err.message || 'Failed to change user status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    if (userToDelete.id === currentUser?.id) {
      setError('You cannot delete your own administrator account.')
      setUserToDelete(null)
      return
    }

    setIsDeleting(true)
    setError('')
    setActionSuccess('')
    try {
      await adminService.deleteUser(userToDelete.id)
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
      setActionSuccess(`User "${userToDelete.name}" was permanently deleted.`)
      setUserToDelete(null)
    } catch (err) {
      setError(err.message || 'Failed to delete user.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminLayout currentTab="users" navigate={navigate}>
      <div className="admin-page-container">
        {/* Header */}
        <div className="admin-page-header">
          <div>
            <div className="admin-breadcrumbs">Administration / Users</div>
            <h1 className="admin-page-title">User Management</h1>
            <p className="admin-page-subtitle">
              Inspect user roles, account active statuses, and manage platform permissions.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={fetchUsers}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Action feedback */}
        {actionSuccess && (
          <div className="alert-banner success" role="alert">
            <span>✓ {actionSuccess}</span>
            <button type="button" onClick={() => setActionSuccess('')} aria-label="Dismiss">×</button>
          </div>
        )}
        {error && (
          <div className="alert-banner" role="alert">
            <span>⚠ {error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="admin-filter-bar">
          <div className="admin-search-wrap">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="admin-search-icon">
              <circle cx="9" cy="9" r="6" />
              <line x1="13.5" y1="13.5" x2="18" y2="18" />
            </svg>
            <input
              type="text"
              placeholder="Search by user name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>

          <div className="admin-filter-group">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="admin-select"
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="USER">User Role</option>
              <option value="ADMIN">Admin Role</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-select"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-table-card">
          {loading ? (
            <div className="admin-loading-wrap">
              <Loading message="Loading platform users…" />
            </div>
          ) : users.length === 0 ? (
            <div className="admin-empty-state">
              <span className="admin-empty-icon">👥</span>
              <h3>No users found</h3>
              <p>Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Tasks Created</th>
                    <th>Joined</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id
                    return (
                      <tr key={u.id} className={!u.isActive ? 'user-deactivated-row' : ''}>
                        <td>
                          <div className="user-identity-cell">
                            <div className={`user-table-avatar ${u.role === 'ADMIN' ? 'admin' : ''}`}>
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="user-table-meta">
                              <span className="user-table-name">
                                {u.name} {isSelf && <span className="self-pill">You</span>}
                              </span>
                              <span className="user-table-email">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-role-badge ${u.role.toLowerCase()}`}>
                            {u.role === 'ADMIN' ? '🛡 ADMIN' : 'USER'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                            {u.isActive ? '● Active' : '○ Deactivated'}
                          </span>
                        </td>
                        <td>
                          <span className="admin-task-count-pill">
                            {u._count?.todos ?? 0} todos
                          </span>
                        </td>
                        <td className="text-muted-cell">
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="text-right">
                          <div className="admin-action-btn-group">
                            <button
                              type="button"
                              className={`admin-table-btn ${u.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                              disabled={isSelf || updatingId === u.id}
                              onClick={() => handleToggleStatus(u)}
                              title={isSelf ? 'Cannot deactivate self' : u.isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              {updatingId === u.id ? '…' : u.isActive ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              className="admin-table-btn btn-delete"
                              disabled={isSelf}
                              onClick={() => setUserToDelete(u)}
                              title={isSelf ? 'Cannot delete self' : 'Permanently delete user'}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {userToDelete && (
          <div className="admin-modal-backdrop" onClick={() => !isDeleting && setUserToDelete(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h3>Confirm User Deletion</h3>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                >
                  ✕
                </button>
              </div>
              <div className="admin-modal-body">
                <p>
                  Are you sure you want to permanently delete <strong>{userToDelete.name}</strong> ({userToDelete.email})?
                </p>
                <div className="admin-warning-box">
                  <span className="warning-icon">⚠</span>
                  <span>This will permanently delete their account and all {userToDelete._count?.todos ?? 0} associated tasks. This action cannot be undone.</span>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
