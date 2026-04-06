import toast from "react-hot-toast";
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
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: (a: boolean) => ({ background: a ? '#7c3aed' : 'rgba(255,255,255,.06)', color: a ? '#fff' : 'rgba(255,255,255,.6)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 20 },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 24 },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  progressBar: { background: 'rgba(255,255,255,.08)', borderRadius: 4, height: 8, marginTop: 4 },
  progressFill: (pct: number, c: string) => ({ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 4, background: c }),
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' },
  infoItem: { background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '10px 12px' },
  infoLabel: { fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 },
  infoVal: { fontSize: 14, fontWeight: 600 },
  techTag: { display: 'inline-block', background: 'rgba(124,58,237,.15)', color: '#a78bfa', borderRadius: 6, padding: '2px 8px', fontSize: 11, marginRight: 4, marginBottom: 4 },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
  actBtn: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' },
};

const STATUS_COLOR: Record<string, string> = { Active: '#34d399', 'On Hold': '#fbbf24', Completed: '#818cf8', Delayed: '#f87171' };

export default function ITProjectsPage() {
  const { records, loading, create } = useBusinessRecords('it_project');
  const [tab, setTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', client: '', techStack: '', teamSize: '', startDate: '', deadline: '', budget: '', status: 'Active' });

  const projects = records.map(r => ({
    id: r.id,
    projectId: (r.data?.projectId as string) || r.id,
    name: r.title,
    client: (r.data?.client as string) || '',
    techStack: (r.data?.techStack as string[]) || [],
    teamSize: Number(r.data?.teamSize) || 0,
    startDate: r.date || (r.data?.startDate as string) || '',
    deadline: (r.data?.deadline as string) || '',
    progress: Number(r.data?.progress) || 0,
    budget: r.amount || Number(r.data?.budget) || 0,
    spent: Number(r.data?.spent) || 0,
    status: r.status || 'Active',
  }));

  const filtered = tab === 'All' ? projects : projects.filter(p => p.status === tab);
  const active = projects.filter(p => p.status === 'Active').length;
  const totalBudget = projects.reduce((a, p) => a + p.budget, 0);
  const delayed = projects.filter(p => p.status === 'Delayed').length;
  const onTime = projects.filter(p => ['Active', 'Completed'].includes(p.status) && new Date(p.deadline) >= new Date()).length;
  const deliveryPct = projects.length > 0 ? Math.round((onTime / projects.length) * 100) : 0;

  const handleAdd = async () => {
    const name = form.name.trim();
    const client = form.client.trim();
    const techStack = form.techStack.split(',').map(s => s.trim()).filter(Boolean);
    const teamSize = Number(form.teamSize);
    const budget = Number(form.budget);
    const duplicateProject = projects.some(p => p.name.toLowerCase() === name.toLowerCase() && p.client.toLowerCase() === client.toLowerCase());
    if (!name || !client || !form.startDate || !form.deadline) {
      toast.error('Project name, client, start date, aur deadline required hain.');
      return;
    }
    if (teamSize <= 0 || budget <= 0 || techStack.length === 0) {
      toast('Team size, budget, aur tech stack valid honi chahiye.');
      return;
    }
    if (new Date(form.deadline) < new Date(form.startDate)) {
      toast('Deadline start date se pehle nahi ho sakti.');
      return;
    }
    if (duplicateProject) {
      toast('Yeh project is client ke liye pehle se maujood hai.');
      return;
    }
    await create({ title: form.name, status: form.status, date: form.startDate, amount: budget, data: { projectId: `PROJ-${String(records.length + 1).padStart(3, '0')}`, client: form.client, techStack, teamSize, startDate: form.startDate, deadline: form.deadline, progress: 0, budget, spent: 0 } });
    setShowModal(false);
    setForm({ name: '', client: '', techStack: '', teamSize: '', startDate: '', deadline: '', budget: '', status: 'Active' });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>💻 Projects</h1>
          <p style={S.sub}>Manage IT development projects</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Active Projects</div><div style={{ ...S.statVal, color: '#34d399' }}>{active}</div></div>
        <div style={S.stat}><div style={S.statLabel}>On-Time Delivery</div><div style={{ ...S.statVal, color: '#818cf8' }}>{deliveryPct}%</div></div>
        <div style={S.stat}><div style={S.statLabel}>Total Budget</div><div style={{ ...S.statVal, color: '#7c3aed', fontSize: 22 }}>Rs. {(totalBudget / 100000).toFixed(1)}L</div></div>
        <div style={S.stat}><div style={S.statLabel}>Overdue Projects</div><div style={{ ...S.statVal, color: '#f87171' }}>{delayed}</div></div>
      </div>

      <div style={S.tabs}>
        {['All', 'Active', 'Completed', 'On Hold', 'Delayed'].map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.grid}>
        {!loading && filtered.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.25)', gridColumn: '1/-1' }}>No projects found.</div>
        )}
        {filtered.map(p => {
          const budgetUsed = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
          const barColor = p.progress === 100 ? '#818cf8' : p.status === 'Delayed' ? '#f87171' : '#7c3aed';
          return (
            <div key={p.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{p.client}</div>
                </div>
                <span style={S.badge(STATUS_COLOR[p.status])}>{p.status}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                {p.techStack.map(t => <span key={t} style={S.techTag}>{t}</span>)}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>
                  <span>Progress</span><span style={{ color: barColor, fontWeight: 600 }}>{p.progress}%</span>
                </div>
                <div style={S.progressBar}><div style={S.progressFill(p.progress, barColor)} /></div>
              </div>
              <div style={S.infoGrid}>
                <div style={S.infoItem}><div style={S.infoLabel}>Team Size</div><div style={S.infoVal}>👥 {p.teamSize} devs</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Deadline</div><div style={{ ...S.infoVal, color: p.status === 'Delayed' ? '#f87171' : '#fff' }}>{p.deadline}</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Budget</div><div style={S.infoVal}>Rs. {(p.budget / 1000).toFixed(0)}K</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Spent</div><div style={{ ...S.infoVal, color: budgetUsed > 90 ? '#f87171' : '#fbbf24' }}>{budgetUsed}% used</div></div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>New Project</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Project Name</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Client</label><input style={S.input} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></div>
            </div>
            <div style={S.field}><label style={S.label}>Tech Stack (comma separated)</label><input style={S.input} value={form.techStack} onChange={e => setForm(p => ({ ...p, techStack: e.target.value }))} placeholder="React, Node.js, MongoDB" /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Team Size</label><input type="number" style={S.input} value={form.teamSize} onChange={e => setForm(p => ({ ...p, teamSize: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Budget (Rs.)</label><input type="number" style={S.input} value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} /></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Start Date</label><input type="date" style={S.input} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Deadline</label><input type="date" style={S.input} value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} /></div>
            </div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Create Project</button>
              <button style={{ ...S.actBtn, flex: 1, padding: '10px' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
