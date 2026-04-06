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
  grid: { display: 'grid', gap: 16 },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 24 },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  progressBar: { background: 'rgba(255,255,255,.08)', borderRadius: 4, height: 6 },
  progressFill: (pct: number, c: string) => ({ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 4, background: c }),
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, margin: '16px 0' },
  infoItem: { background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '10px 12px' },
  infoLabel: { fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 },
  infoVal: { fontSize: 14, fontWeight: 600 },
  actRow: { display: 'flex', gap: 8, marginTop: 12 },
  actBtn: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
};

const CONTRACT_TYPES = ['Fixed Price', 'Time & Material', 'Retainer', 'Maintenance AMC'];
const PAYMENT_SCHEDULES = ['Monthly', 'Milestone', 'Upfront', 'Quarterly'];
const STATUS_COLOR: Record<string, string> = { Active: '#34d399', Expiring: '#fbbf24', Expired: '#f87171', Draft: '#6b7280', Terminated: '#ef4444' };

export default function ContractsPage() {
  const { records, loading, create, update } = useBusinessRecords('contract');
  const [tab, setTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client: '', project: '', type: 'Fixed Price', value: '', start: '', end: '', payment: 'Monthly', status: 'Active' });
  const [todayTs] = useState(() => Date.now());

  const contracts = records.map(r => {
    const end = (r.data?.end as string) || '';
    const daysLeft = end ? Math.round((new Date(end).getTime() - todayTs) / 86400000) : 0;
    return {
      id: r.id,
      contractId: (r.data?.contractId as string) || r.id,
      client: r.title,
      project: (r.data?.project as string) || '',
      type: (r.data?.type as string) || 'Fixed Price',
      value: r.amount || Number(r.data?.value) || 0,
      start: r.date || (r.data?.start as string) || '',
      end,
      daysLeft,
      payment: (r.data?.payment as string) || 'Monthly',
      status: r.status || 'Active',
      mrr: Number(r.data?.mrr) || 0,
    };
  });

  const filtered = tab === 'All' ? contracts : contracts.filter(c => c.status === tab);
  const active = contracts.filter(c => c.status === 'Active').length;
  const expiring = contracts.filter(c => c.status === 'Expiring').length;
  const totalValue = contracts.filter(c => c.status === 'Active').reduce((a, c) => a + c.value, 0);
  const mrr = contracts.filter(c => c.status === 'Active').reduce((a, c) => a + c.mrr, 0);

  const renew = async (id: string, end: string) => {
    const newEnd = new Date(end); newEnd.setFullYear(newEnd.getFullYear() + 1);
    await update(id, { status: 'Active', data: { end: newEnd.toISOString().split('T')[0], daysLeft: 365 } });
  };
  const terminate = async (id: string) => { await update(id, { status: 'Terminated' }); };

  const handleAdd = async () => {
    const client = form.client.trim();
    const project = form.project.trim();
    const value = Number(form.value);
    const duplicateContract = contracts.some(c => c.client.toLowerCase() === client.toLowerCase() && c.project.toLowerCase() === project.toLowerCase() && c.status !== 'Terminated');
    if (!client || !project || !form.start || !form.end) {
      toast.error('Client, project, start, aur end date required hain.');
      return;
    }
    if (new Date(form.end) < new Date(form.start)) {
      toast('Contract end date start se pehle nahi ho sakti.');
      return;
    }
    if (value <= 0) {
      toast('Contract value positive honi chahiye.');
      return;
    }
    if (duplicateContract) {
      toast.error('Is client project ke liye active contract already maujood hai.');
      return;
    }
    const days = form.end ? Math.round((new Date(form.end).getTime() - todayTs) / 86400000) : 0;
    const mrr = form.type === 'Retainer' ? value / 12 : 0;
    await create({ title: form.client, status: form.status, date: form.start, amount: value, data: { contractId: `CON-${String(records.length + 1).padStart(3, '0')}`, project: form.project, type: form.type, value, start: form.start, end: form.end, daysLeft: days, payment: form.payment, mrr } });
    setShowModal(false);
    setForm({ client: '', project: '', type: 'Fixed Price', value: '', start: '', end: '', payment: 'Monthly', status: 'Active' });
  };

  const timeElapsed = (start: string, end: string) => {
    if (!start || !end) return 0;
    const total = new Date(end).getTime() - new Date(start).getTime();
    const elapsed = todayTs - new Date(start).getTime();
    return Math.min(Math.round((elapsed / total) * 100), 100);
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📄 Contracts</h1>
          <p style={S.sub}>Manage client contracts and agreements</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ New Contract</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Active Contracts</div><div style={{ ...S.statVal, color: '#34d399' }}>{active}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Expiring in 30 Days</div><div style={{ ...S.statVal, color: '#fbbf24' }}>{expiring}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Total Contract Value</div><div style={{ ...S.statVal, color: '#7c3aed', fontSize: 22 }}>Rs. {(totalValue / 100000).toFixed(1)}L</div></div>
        <div style={S.stat}><div style={S.statLabel}>MRR from Retainers</div><div style={{ ...S.statVal, color: '#38bdf8', fontSize: 22 }}>Rs. {mrr.toLocaleString()}</div></div>
      </div>

      <div style={S.tabs}>
        {['All', 'Active', 'Expiring', 'Expired', 'Draft'].map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.grid}>
        {!loading && filtered.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.25)' }}>No contracts found.</div>
        )}
        {filtered.map(c => {
          const pct = timeElapsed(c.start, c.end);
          return (
            <div key={c.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{c.client}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{c.project} · {c.contractId}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={S.badge('#a78bfa')}>{c.type}</span>
                  <span style={S.badge(STATUS_COLOR[c.status])}>{c.status}</span>
                </div>
              </div>
              <div style={S.infoGrid}>
                <div style={S.infoItem}><div style={S.infoLabel}>Value</div><div style={S.infoVal}>Rs. {(c.value / 1000).toFixed(0)}K</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Payment</div><div style={S.infoVal}>{c.payment}</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Start</div><div style={S.infoVal}>{c.start}</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>End / Days Left</div><div style={{ ...S.infoVal, color: c.daysLeft <= 14 ? '#f87171' : c.daysLeft <= 30 ? '#fbbf24' : '#fff' }}>{c.end} ({c.daysLeft}d)</div></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>
                  <span>Time Elapsed</span><span style={{ color: '#7c3aed', fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={S.progressBar}><div style={S.progressFill(pct, pct >= 90 ? '#f87171' : '#7c3aed')} /></div>
              </div>
              <div style={S.actRow}>
                {(c.status === 'Expiring' || c.status === 'Expired') && <button style={{ ...S.actBtn, color: '#34d399' }} onClick={() => renew(c.id, c.end)}>Renew</button>}
                {c.status === 'Active' && <button style={{ ...S.actBtn, color: '#f87171' }} onClick={() => terminate(c.id)}>Terminate</button>}
                <button style={S.actBtn}>View Details</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>New Contract</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Client</label><input style={S.input} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Project</label><input style={S.input} value={form.project} onChange={e => setForm(p => ({ ...p, project: e.target.value }))} /></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Contract Type</label><select style={S.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div style={S.field}><label style={S.label}>Payment Schedule</label><select style={S.input} value={form.payment} onChange={e => setForm(p => ({ ...p, payment: e.target.value }))}>{PAYMENT_SCHEDULES.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={S.field}><label style={S.label}>Contract Value (Rs.)</label><input type="number" style={S.input} value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Start Date</label><input type="date" style={S.input} value={form.start} onChange={e => setForm(p => ({ ...p, start: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>End Date</label><input type="date" style={S.input} value={form.end} onChange={e => setForm(p => ({ ...p, end: e.target.value }))} /></div>
            </div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Save Contract</button>
              <button style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
