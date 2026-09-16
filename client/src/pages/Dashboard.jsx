import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function Dashboard({ navigate }) {
  const { user } = useAuth()

  return (
    <main className="dashboard">
      <Navbar navigate={navigate} />

      <section className="dashboard-content">
        <p className="eyebrow">Your workspace</p>
        <h1>Welcome, {user.name.split(' ')[0]}.</h1>
        <p className="dashboard-lede">
          Everything you need to keep your day moving with intention.
        </p>

        <div className="empty-card">
          <div className="empty-icon">✦</div>
          <h2>Your main module is ready</h2>
          <p>
            This is your space for tasks, projects, and the things that matter most.
            Your productivity tools will live here.
          </p>
          <span className="coming-soon">Coming soon</span>
        </div>

        <div className="user-card">
          <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <p className="card-label">Signed in as</p>
            <strong>{user.name}</strong>
            <p>{user.email}</p>
          </div>
        </div>
      </section>
    </main>
  )
}
