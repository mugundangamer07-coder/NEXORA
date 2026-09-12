import { useEffect, useState } from 'react'
import { Users, FileText, HelpCircle, ClipboardList, Building2, Loader2, ShieldCheck } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { Card, CardHead, SectionTitle, StatTile, Pill } from '../components/ui.jsx'

const ROLE_LABEL = { learner: 'Learners', manager: 'Training Managers', admin: 'Admins' }

// The system Admin's view: users, departments, materials, assessments and
// overall platform statistics — separate from the Training Manager's
// competency analytics (which lives on /manager).
export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    apiFetch('/admin/stats')
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  if (error) {
    return (
      <div>
        <SectionTitle>Admin Dashboard</SectionTitle>
        <Card className="text-sm text-rose-600">Could not load system statistics: {error}</Card>
      </div>
    )
  }
  if (!data) {
    return (
      <div>
        <SectionTitle>Admin Dashboard</SectionTitle>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading system statistics…
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionTitle
        sub="System-wide numbers — users, departments, learning materials and assessments across NEXORA."
        right={<Pill tone="slate">{data.totalUsers} users total</Pill>}
      >
        Admin Dashboard
      </SectionTitle>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Total users" value={data.totalUsers} tone="brand" hint="learners, managers, admins" />
        <StatTile icon={FileText} label="Learning materials" value={data.materialsCount} hint="PDFs uploaded" />
        <StatTile icon={HelpCircle} label="Questions generated" value={data.questionsCount} hint="across all materials" />
        <StatTile icon={ClipboardList} label="Assessments taken" value={data.assessmentsCount} hint={`avg score ${data.avgOverall ?? '—'}%`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Users by role" icon={ShieldCheck} sub="Who has access to what" />
          <div className="space-y-2">
            {Object.entries(data.usersByRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="font-medium text-ink-900">{ROLE_LABEL[role] || role}</span>
                <span className="tabular-nums text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Departments" icon={Building2} sub="Users per department" />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.departments.map((d) => (
              <div key={d.department} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="font-medium text-ink-900">{d.department}</span>
                <span className="tabular-nums text-slate-500">{d.c}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Recent learning materials" icon={FileText} sub="Latest uploads across the platform" />
          <div className="space-y-2">
            {data.recentMaterials.length === 0 && <p className="text-sm text-slate-400">No materials uploaded yet.</p>}
            {data.recentMaterials.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium text-ink-900 truncate">{m.originalName}</div>
                  <div className="text-xs text-slate-400">by {m.ownerName}</div>
                </div>
                <Pill tone={m.status === 'analyzed' ? 'strong' : 'slate'}>{m.status}</Pill>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Recently registered users" icon={Users} sub="Latest accounts created" />
          <div className="space-y-2">
            {data.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium text-ink-900 truncate">{u.name}</div>
                  <div className="text-xs text-slate-400 truncate">{u.email}</div>
                </div>
                <Pill tone={u.role === 'admin' ? 'gap' : u.role === 'manager' ? 'blue' : 'slate'}>{u.role}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 bg-slate-50">
        <p className="text-xs text-slate-500">
          This is a hackathon prototype: numbers above are real, computed live from the SQLite database — not mocked.
          Learning materials and their extracted content are only ever used to generate that material's own quiz.
        </p>
      </Card>
    </div>
  )
}
