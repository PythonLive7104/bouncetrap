import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

const GROWTH_PLANS = ['growth', 'pro', 'enterprise']

const ROLE_BADGE = {
  admin:  'bg-brand-500/15 text-brand-300 border-brand-500/20',
  member: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  viewer: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGE[role] || ROLE_BADGE.member}`}>
      {role}
    </span>
  )
}

function Avatar({ name, email }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email ? email[0].toUpperCase() : '?'
  return (
    <div className="w-8 h-8 rounded-full bg-brand-800/60 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
      {initials}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#13132a] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CreateTeamModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/teams/', { name: name.trim() })
      onCreate(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create team.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Create Team" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Team name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Acme Marketing Team"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function InviteModal({ team, onClose }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await api.post(`/teams/${team.id}/invite/`, { email: email.trim(), role })
      setSuccess(`Invitation sent to ${email}. Token: ${data.invite_token}`)
      setEmail('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Invite to ${team.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50">
            <option value="member">Member — can use team resources</option>
            <option value="viewer">Viewer — read only</option>
            <option value="admin">Admin — full control</option>
          </select>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && (
          <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs break-all">
            {success}
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors">
            Close
          </button>
          <button type="submit" disabled={loading || !email.trim()}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AcceptInviteModal({ onClose, onAccepted }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/teams/accept-invite/', { token: token.trim() })
      onAccepted(data.team)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired token.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Join a Team" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-400">Paste the invite token you received.</p>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Invite token</label>
          <input
            autoFocus
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Paste token here"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading || !token.trim()}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {loading ? 'Joining…' : 'Join Team'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TeamCard({ team, currentUser, onSelect, onDeleted }) {
  const isOwner = team.is_owner
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e) {
    e.stopPropagation()
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.delete(`/teams/${team.id}/`)
      onDeleted(team.id)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div
      onClick={() => onSelect(team)}
      className="bg-white/[0.03] border border-white/7 hover:border-white/12 hover:bg-white/[0.05] rounded-2xl p-5 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-800/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{team.name}</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {isOwner ? 'Owner' : <RoleBadge role={team.my_role} />}
            </p>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{team.member_count} member{team.member_count !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

function TeamDetailPanel({ team, currentUser, onClose, onUpdated }) {
  const [members, setMembers] = useState(team.members || [])
  const [showInvite, setShowInvite] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(team.name)
  const [savingName, setSavingName] = useState(false)

  const isOwner   = team.is_owner
  const myRole    = team.my_role
  const isAdmin   = isOwner || myRole === 'admin'

  async function handleRoleChange(userId, role) {
    try {
      await api.patch(`/teams/${team.id}/members/${userId}/`, { role })
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m))
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update role.')
    }
  }

  async function handleRemove(userId) {
    const m = members.find(m => m.id === userId)
    const isSelf = m?.id === currentUser?.id
    const msg = isSelf ? 'Leave this team?' : `Remove ${m?.full_name || m?.email}?`
    if (!confirm(msg)) return
    try {
      await api.delete(`/teams/${team.id}/members/${userId}/`)
      if (isSelf) { onClose(); return }
      setMembers(prev => prev.filter(m => m.id !== userId))
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove member.')
    }
  }

  async function handleSaveName(e) {
    e.preventDefault()
    if (!newName.trim() || newName.trim() === team.name) { setEditingName(false); return }
    setSavingName(true)
    try {
      const { data } = await api.patch(`/teams/${team.id}/`, { name: newName.trim() })
      onUpdated({ ...team, name: data.name })
      setEditingName(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to rename team.')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/7 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {editingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2 flex-1 min-w-0">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button type="submit" disabled={savingName}
                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold disabled:opacity-50">
                {savingName ? '…' : 'Save'}
              </button>
              <button type="button" onClick={() => { setEditingName(false); setNewName(team.name) }}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 text-xs">
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-white font-semibold truncate">{team.name}</h2>
              {isOwner && (
                <button onClick={() => setEditingName(true)}
                  className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 text-sm font-medium transition-colors shrink-0 ml-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
          {members.length} Member{members.length !== 1 ? 's' : ''}
        </p>
        {members.map(m => {
          const isSelf  = m.id === currentUser?.id
          const isOwnerRow = m.is_owner
          const canEdit = isAdmin && !isOwnerRow
          const canLeave = isSelf && !isOwnerRow
          const canRemove = isAdmin && !isOwnerRow && !isSelf

          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Avatar name={m.full_name} email={m.email} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {m.full_name || m.email}
                  {isSelf && <span className="ml-1.5 text-xs text-slate-500">(you)</span>}
                  {isOwnerRow && <span className="ml-1.5 text-xs text-slate-500">· owner</span>}
                </p>
                {m.full_name && <p className="text-slate-500 text-xs truncate">{m.email}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEdit ? (
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <RoleBadge role={isOwnerRow ? 'admin' : m.role} />
                )}
                {(canRemove || canLeave) && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title={canLeave ? 'Leave team' : 'Remove member'}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showInvite && (
        <InviteModal team={team} onClose={() => setShowInvite(false)} />
      )}
    </div>
  )
}

export default function TeamsPage() {
  const { user } = useAuthStore()
  const [teams, setTeams]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAccept, setShowAccept] = useState(false)

  const isGrowthPlus = GROWTH_PLANS.includes(user?.plan)

  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await api.get('/teams/')
      setTeams(Array.isArray(data) ? data : (data.results ?? []))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  function handleCreated(team) {
    setTeams(prev => [team, ...prev])
    setSelected(team)
  }

  function handleDeleted(id) {
    setTeams(prev => prev.filter(t => t.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  function handleUpdated(team) {
    setTeams(prev => prev.map(t => t.id === team.id ? { ...t, name: team.name } : t))
    setSelected(prev => prev?.id === team.id ? { ...prev, name: team.name } : prev)
  }

  function handleAccepted(team) {
    setTeams(prev => prev.some(t => t.id === team.id) ? prev : [...prev, team])
    setSelected(team)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/7 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-slate-400 text-sm mt-1">Collaborate with teammates under shared resources.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAccept(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Join via Invite
          </button>
          {isGrowthPlus ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Team
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-500 text-sm cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Growth+ required
            </div>
          )}
        </div>
      </div>

      {!isGrowthPlus && teams.length === 0 && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-amber-500/8 border border-amber-500/20 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <p className="text-amber-300 font-semibold text-sm">Teams require Growth plan or above</p>
            <p className="text-amber-400/70 text-xs mt-0.5">Upgrade to create teams and invite collaborators.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team list */}
        <div className={`${selected ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
          {teams.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-white/[0.02] border border-white/7 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium text-sm">No teams yet</p>
              <p className="text-slate-600 text-xs mt-1">
                {isGrowthPlus ? 'Create a team or join one via invite.' : 'Upgrade to Growth to create teams.'}
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 ${selected ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {teams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  currentUser={user}
                  onSelect={t => setSelected(t)}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-2">
            <TeamDetailPanel
              team={selected}
              currentUser={user}
              onClose={() => setSelected(null)}
              onUpdated={handleUpdated}
            />
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTeamModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />
      )}
      {showAccept && (
        <AcceptInviteModal onClose={() => setShowAccept(false)} onAccepted={handleAccepted} />
      )}
    </div>
  )
}
