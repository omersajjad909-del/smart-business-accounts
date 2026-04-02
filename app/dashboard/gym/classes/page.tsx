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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 24 },
  classTitle: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  instructor: { fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 16 },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }),
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' },
  infoItem: { background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '10px 12px' },
  infoLabel: { fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 },
  infoVal: { fontSize: 15, fontWeight: 600 },
  progressBar: { background: 'rgba(255,255,255,.08)', borderRadius: 4, height: 6, marginTop: 4 },
  progressFill: (pct: number, c: string) => ({ width: `${pct}%`, height: '100%', borderRadius: 4, background: c }),
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

const STATUS_COLOR: Record<string, string> = { Open: '#34d399', Full: '#f87171', Cancelled: '#6b7280' };

export default function ClassesPage() {
  const { records, loading, create, update } = useBusinessRecords('gym_class');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', instructor: '', days: '', time: '', duration: '', capacity: '' });

  const classes = records.map(r => ({
    id: r.id,
    name: r.title,
    instructor: (r.data?.instructor as string) || '',
    days: (r.data?.days as string) || '',
    time: (r.data?.time as string) || '',
    duration: Number(r.data?.duration) || 60,
    capacity: Number(r.data?.capacity) || 20,
    enrolled: Number(r.data?.enrolled) || 0,
    status: r.status || 'Open',
    icon: (r.data?.icon as string) || '💪',
  }));

  const totalEnrolled = classes.reduce((a, c) => a + c.enrolled, 0);
  const totalCapacity = classes.reduce((a, c) => a + c.capacity, 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;
  const open = classes.filter(c => c.status === 'Open').length;

  const handleAdd = async () => {
    await create({ title: form.name, status: 'Open', data: { classId: `CLS-${String(records.length + 1).padStart(3, '0')}`, instructor: form.instructor, days: form.days, time: form.time, duration: Number(form.duration), capacity: Number(form.capacity), enrolled: 0, icon: '💪' } });
    setShowModal(false);
    setForm({ name: '', instructor: '', days: '', time: '', duration: '', capacity: '' });
  };

  const toggleStatus = async (id: string, currentStatus: string, enrolled: number, capacity: number) => {
    if (currentStatus === 'Cancelled') {
      await update(id, { status: enrolled >= capacity ? 'Full' : 'Open' });
    } else {
      await update(id, { status: 'Cancelled' });
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📅 Class Schedule</h1>
          <p style={S.sub}>Manage fitness classes and schedules</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ Add Class</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Total Classes</div><div style={S.statVal}>{classes.length}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Classes Open</div><div style={{ ...S.statVal, color: '#34d399' }}>{open}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Members Enrolled</div><div style={{ ...S.statVal, color: '#38bdf8' }}>{totalEnrolled}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Avg Occupancy</div><div style={{ ...S.statVal, color: '#fbbf24' }}>{avgOccupancy}%</div></div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.grid}>
        {!loading && classes.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.25)' }}>No classes found.</div>
        )}
        {classes.map(c => {
          const pct = c.capacity > 0 ? Math.round((c.enrolled / c.capacity) * 100) : 0;
          const barColor = pct >= 100 ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399';
          return (
            <div key={c.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={S.classTitle}>{c.icon} {c.name}</div>
                  <div style={S.instructor}>👤 {c.instructor}</div>
                </div>
                <span style={S.badge(STATUS_COLOR[c.status])}>{c.status}</span>
              </div>
              <div style={S.infoGrid}>
                <div style={S.infoItem}><div style={S.infoLabel}>Schedule</div><div style={S.infoVal}>{c.days}</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Time</div><div style={S.infoVal}>{c.time}</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Duration</div><div style={S.infoVal}>{c.duration} min</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Capacity</div><div style={S.infoVal}>{c.enrolled}/{c.capacity}</div></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>
                  <span>Occupancy</span><span style={{ color: barColor, fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={S.progressBar}><div style={S.progressFill(pct, barColor)} /></div>
              </div>
              <div style={S.actRow}>
                <button style={S.actBtn}>Edit</button>
                <button style={{ ...S.actBtn, color: c.status === 'Cancelled' ? '#34d399' : '#f87171' }} onClick={() => toggleStatus(c.id, c.status, c.enrolled, c.capacity)}>{c.status === 'Cancelled' ? 'Activate' : 'Cancel'}</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Add New Class</div>
            <div style={S.field}><label style={S.label}>Class Name</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Morning Yoga" /></div>
            <div style={S.field}><label style={S.label}>Instructor</label><input style={S.input} value={form.instructor} onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))} placeholder="Instructor name" /></div>
            <div style={S.field}><label style={S.label}>Days</label><input style={S.input} value={form.days} onChange={e => setForm(p => ({ ...p, days: e.target.value }))} placeholder="e.g. Mon, Wed, Fri" /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Time</label><input style={S.input} value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} placeholder="6:00 AM" /></div>
              <div style={S.field}><label style={S.label}>Duration (min)</label><input type="number" style={S.input} value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="60" /></div>
            </div>
            <div style={S.field}><label style={S.label}>Capacity</label><input type="number" style={S.input} value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="20" /></div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Add Class</button>
              <button style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
