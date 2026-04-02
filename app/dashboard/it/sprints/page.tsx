'use client';
import { useState } from 'react';
import { useBusinessRecords } from '@/lib/useBusinessRecords';

const S = {
  page: { padding: '32px', fontFamily: 'Inter, sans-serif', color: '#fff', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.5)', marginTop: 4 },
  btn: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
  stat: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '20px 24px' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 6 },
  statVal: { fontSize: 28, fontWeight: 700 },
  grid: { display: 'grid', gap: 20 },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 24 },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  kanban: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, margin: '20px 0' },
  kanbanCol: (c: string) => ({ background: `${c}10`, border: `1px solid ${c}30`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' as const }),
  kanbanLabel: { fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 6 },
  kanbanCount: (c: string) => ({ fontSize: 28, fontWeight: 700, color: c }),
  progressBar: { background: 'rgba(255,255,255,.08)', borderRadius: 4, height: 6 },
  progressFill: (pct: number, c: string) => ({ width: `${pct}%`, height: '100%', borderRadius: 4, background: c }),
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
  actBtn: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginRight: 4 },
};

const STATUS_COLOR: Record<string, string> = { Active: '#34d399', Completed: '#818cf8', Planning: '#38bdf8' };

export default function SprintsPage() {
  const { records, loading, create } = useBusinessRecords('sprint');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ projectName: '', name: '', start: '', end: '', total: '', status: 'Active' });
  const [todayTs] = useState(() => Date.now());

  const sprints = records.map(r => ({
    id: r.id,
    sprintId: (r.data?.sprintId as string) || r.id,
    projectName: (r.data?.projectName as string) || '',
    name: r.title,
    start: r.date || (r.data?.start as string) || '',
    end: (r.data?.end as string) || '',
    total: Number(r.data?.total) || 0,
    completed: Number(r.data?.completed) || 0,
    inProgress: Number(r.data?.inProgress) || 0,
    blocked: Number(r.data?.blocked) || 0,
    velocity: Number(r.data?.velocity) || 0,
    status: r.status || 'Active',
    team: (r.data?.team as string[]) || [],
  }));

  const activeSprints = sprints.filter(s => s.status === 'Active').length;
  const totalStories = sprints.reduce((a, s) => a + s.total, 0);
  const totalCompleted = sprints.reduce((a, s) => a + s.completed, 0);
  const velocitySprints = sprints.filter(s => s.velocity > 0);
  const avgVelocity = velocitySprints.length > 0 ? Math.round(velocitySprints.reduce((a, s) => a + s.velocity, 0) / velocitySprints.length) : 0;

  const handleAdd = async () => {
    const projectName = form.projectName.trim();
    const name = form.name.trim();
    const total = Number(form.total);
    const duplicateSprint = sprints.some(s => s.projectName.toLowerCase() === projectName.toLowerCase() && s.name.toLowerCase() === name.toLowerCase());
    if (!projectName || !name || !form.start || !form.end) {
      alert('Project name, sprint name, start, aur end date required hain.');
      return;
    }
    if (new Date(form.end) < new Date(form.start)) {
      alert('Sprint end date start se pehle nahi ho sakti.');
      return;
    }
    if (total <= 0) {
      alert('Total stories/points positive hone chahiye.');
      return;
    }
    if (duplicateSprint) {
      alert('Yeh sprint is project ke liye pehle se maujood hai.');
      return;
    }
    await create({ title: form.name, status: form.status, date: form.start, data: { sprintId: `SPR-${String(records.length + 1).padStart(3, '0')}`, projectName: form.projectName, start: form.start, end: form.end, total, completed: 0, inProgress: 0, blocked: 0, velocity: 0, team: [] } });
    setShowModal(false);
    setForm({ projectName: '', name: '', start: '', end: '', total: '', status: 'Active' });
  };

  const daysLeft = (end: string) => {
    const diff = Math.round((new Date(end).getTime() - todayTs) / 86400000);
    return diff;
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🏃 Sprint Tracking</h1>
          <p style={S.sub}>Agile sprint management and progress</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ New Sprint</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Active Sprints</div><div style={{ ...S.statVal, color: '#34d399' }}>{activeSprints}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Total Stories</div><div style={S.statVal}>{totalStories}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Completed Stories</div><div style={{ ...S.statVal, color: '#818cf8' }}>{totalCompleted}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Avg Velocity</div><div style={{ ...S.statVal, color: '#7c3aed' }}>{avgVelocity} pts</div></div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.grid}>
        {!loading && sprints.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.25)' }}>No sprints found.</div>
        )}
        {sprints.map(s => {
          const toDo = s.total - s.completed - s.inProgress - s.blocked;
          const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
          const days = daysLeft(s.end);
          return (
            <div key={s.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{s.projectName}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={S.badge(STATUS_COLOR[s.status])}>{s.status}</span>
                  {s.status === 'Active' && s.end && <span style={{ fontSize: 13, color: days < 0 ? '#f87171' : days <= 2 ? '#fbbf24' : 'rgba(255,255,255,.5)' }}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}</span>}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 16 }}>{s.start} → {s.end}</div>

              <div style={S.kanban}>
                <div style={S.kanbanCol('#6b7280')}><div style={S.kanbanLabel}>To Do</div><div style={S.kanbanCount('#d1d5db')}>{toDo}</div></div>
                <div style={S.kanbanCol('#38bdf8')}><div style={S.kanbanLabel}>In Progress</div><div style={S.kanbanCount('#38bdf8')}>{s.inProgress}</div></div>
                <div style={S.kanbanCol('#f87171')}><div style={S.kanbanLabel}>Blocked</div><div style={S.kanbanCount('#f87171')}>{s.blocked}</div></div>
                <div style={S.kanbanCol('#34d399')}><div style={S.kanbanLabel}>Done</div><div style={S.kanbanCount('#34d399')}>{s.completed}</div></div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>
                  <span>Progress ({s.completed}/{s.total} stories)</span>
                  <span style={{ color: '#7c3aed', fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={S.progressBar}><div style={S.progressFill(pct, '#7c3aed')} /></div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, gap: 8 }}>
                <div>{s.team.map(m => <span key={m} style={S.avatar}>{m}</span>)}</div>
                {s.velocity > 0 && <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginLeft: 8 }}>Velocity: {s.velocity} pts</span>}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>New Sprint</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Project Name</label><input style={S.input} value={form.projectName} onChange={e => setForm(p => ({ ...p, projectName: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Sprint Name</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Sprint 1" /></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Start Date</label><input type="date" style={S.input} value={form.start} onChange={e => setForm(p => ({ ...p, start: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>End Date</label><input type="date" style={S.input} value={form.end} onChange={e => setForm(p => ({ ...p, end: e.target.value }))} /></div>
            </div>
            <div style={S.field}><label style={S.label}>Total Stories / Points</label><input type="number" style={S.input} value={form.total} onChange={e => setForm(p => ({ ...p, total: e.target.value }))} placeholder="20" /></div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Create Sprint</button>
              <button style={{ ...S.actBtn, flex: 1, padding: '10px' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
