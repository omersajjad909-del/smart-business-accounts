import toast from "react-hot-toast";
'use client';
import { useState } from 'react';
import { useBusinessRecords } from '@/lib/useBusinessRecords';

const S = {
  page: { padding: '32px', fontFamily: 'Inter, sans-serif', color: '#fff', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.5)', marginTop: 4 },
  btn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
  stat: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '20px 24px' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 6 },
  statVal: { fontSize: 28, fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 24 },
  avatar: (c: string) => ({ width: 60, height: 60, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, marginBottom: 16 }),
  name: { fontWeight: 700, fontSize: 17, marginBottom: 4 },
  spec: { display: 'inline-block', background: 'rgba(22,163,74,.15)', color: '#16a34a', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, marginBottom: 12 },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 8 },
  stars: (r: number) => Array.from({ length: 5 }, (_, i) => i < r ? '⭐' : '☆').join(''),
  certBadge: { background: 'rgba(56,189,248,.12)', color: '#38bdf8', borderRadius: 6, padding: '2px 8px', fontSize: 11, marginRight: 4, marginBottom: 4, display: 'inline-block' },
  actRow: { display: 'flex', gap: 8, marginTop: 16 },
  actBtn: { flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '8px', fontSize: 13, cursor: 'pointer' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
};

const COLORS = ['#16a34a', '#0369a1', '#db2777', '#7c3aed', '#c2410c'];
const SPECS = ['Weight Training', 'Yoga', 'Cardio', 'Boxing', 'CrossFit', 'Pilates', 'Swimming'];

export default function TrainersPage() {
  const { records, loading, create } = useBusinessRecords('trainer');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', specialization: 'Weight Training', salary: '', status: 'Active' });

  const trainers = records.map((r, idx) => ({
    id: r.id,
    trainerId: (r.data?.trainerId as string) || r.title,
    name: r.title,
    specialization: (r.data?.specialization as string) || '',
    certifications: (r.data?.certifications as string[]) || [],
    activeClients: Number(r.data?.activeClients) || 0,
    salary: r.amount || Number(r.data?.salary) || 0,
    status: r.status || 'Active',
    rating: Number(r.data?.rating) || 4,
    colorIdx: idx % COLORS.length,
  }));

  const active = trainers.filter(t => t.status === 'Active').length;
  const totalClients = trainers.reduce((a, t) => a + t.activeClients, 0);
  const avgRating = trainers.length > 0 ? (trainers.reduce((a, t) => a + t.rating, 0) / trainers.length).toFixed(1) : '0.0';

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('');

  const handleAdd = async () => {
    const name = form.name.trim();
    const salary = Number(form.salary);
    if (!name) {
      toast.error('Trainer name required hai.');
      return;
    }
    if (!salary || salary <= 0) {
      toast('Monthly salary valid honi chahiye.');
      return;
    }
    if (trainers.some(t => t.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error('Ye trainer already list me maujood hai.');
      return;
    }
    await create({ title: name, status: form.status, amount: salary, data: { trainerId: `TRN-${String(records.length + 1).padStart(3, '0')}`, specialization: form.specialization, certifications: [], activeClients: 0, salary, rating: 4 } });
    setShowModal(false);
    setForm({ name: '', specialization: 'Weight Training', salary: '', status: 'Active' });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>👟 Trainers</h1>
          <p style={S.sub}>Manage your fitness training team</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ Add Trainer</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Total Trainers</div><div style={S.statVal}>{trainers.length}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Active Today</div><div style={{ ...S.statVal, color: '#34d399' }}>{active}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Total Clients</div><div style={{ ...S.statVal, color: '#38bdf8' }}>{totalClients}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Avg Rating</div><div style={{ ...S.statVal, color: '#fbbf24' }}>⭐ {avgRating}</div></div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.grid}>
        {!loading && trainers.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.25)' }}>No trainers found.</div>
        )}
        {trainers.map(t => (
          <div key={t.id} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={S.avatar(COLORS[t.colorIdx])}>{initials(t.name)}</div>
              <span style={S.badge(t.status === 'Active' ? '#34d399' : '#fbbf24')}>{t.status}</span>
            </div>
            <div style={S.name}>{t.name}</div>
            <div style={{ marginBottom: 12 }}><span style={S.spec}>{t.specialization}</span></div>
            <div style={{ marginBottom: 12 }}>
              {t.certifications.map(c => <span key={c} style={S.certBadge}>{c}</span>)}
            </div>
            <div style={{ fontSize: 18, marginBottom: 12, letterSpacing: 2 }}>{S.stars(t.rating)}</div>
            <div style={S.infoRow}><span>👥 Active Clients</span><span style={{ color: '#fff', fontWeight: 600 }}>{t.activeClients}</span></div>
            <div style={S.infoRow}><span>💰 Monthly Salary</span><span style={{ color: '#34d399', fontWeight: 600 }}>Rs. {t.salary.toLocaleString()}</span></div>
            <div style={S.infoRow}><span>🪪 {t.trainerId}</span></div>
            <div style={S.actRow}>
              <button style={S.actBtn}>View Schedule</button>
              <button style={S.actBtn}>Edit</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Add New Trainer</div>
            <div style={S.field}><label style={S.label}>Full Name</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Trainer name" /></div>
            <div style={S.field}><label style={S.label}>Specialization</label><select style={S.input} value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))}>{SPECS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Monthly Salary (Rs.)</label><input type="number" style={S.input} value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} placeholder="45000" /></div>
              <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}><option>Active</option><option>Off Duty</option></select></div>
            </div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Add Trainer</button>
              <button style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
