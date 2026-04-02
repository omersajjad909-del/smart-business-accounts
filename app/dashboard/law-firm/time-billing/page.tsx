'use client';
import { useState } from 'react';
import { useBusinessRecords } from '@/lib/useBusinessRecords';

const S = {
  page: { padding: '32px', fontFamily: 'Inter, sans-serif', color: '#fff', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.5)', marginTop: 4 },
  btn: { background: '#92400e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
  stat: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '20px 24px' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 6 },
  statVal: { fontSize: 28, fontWeight: 700 },
  filters: { display: 'flex', gap: 12, marginBottom: 24 },
  filterSelect: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,.5)', borderBottom: '1px solid rgba(255,255,255,.07)', fontWeight: 600 },
  td: { padding: '14px 16px', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,.04)' },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
  actBtn: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
};

const LAWYERS = ['All', 'Adv. Rehman', 'Adv. Siddiqui', 'Adv. Farooq'];

export default function TimeBillingPage() {
  const { records, loading, create, update } = useBusinessRecords('time_entry');
  const [lawyerFilter, setLawyerFilter] = useState('All');
  const [billableFilter, setBillableFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ lawyer: 'Adv. Rehman', caseId: '', caseTitle: '', task: '', hours: '', rate: '5000', billable: 'Yes' });

  const entries = records.map(r => ({
    id: r.id,
    entryId: (r.data?.entryId as string) || r.id,
    date: r.date || (r.data?.date as string) || '',
    lawyer: r.title,
    caseId: (r.data?.caseId as string) || '',
    caseTitle: (r.data?.caseTitle as string) || '',
    task: (r.data?.task as string) || '',
    hours: Number(r.data?.hours) || 0,
    rate: Number(r.data?.rate) || 0,
    amount: r.amount || Number(r.data?.amount) || 0,
    billable: Boolean(r.data?.billable),
    billed: r.status === 'billed',
  }));

  const filtered = entries.filter(e => {
    if (lawyerFilter !== 'All' && e.lawyer !== lawyerFilter) return false;
    if (billableFilter === 'Billable' && !e.billable) return false;
    if (billableFilter === 'Non-Billable' && e.billable) return false;
    return true;
  });

  const totalHours = entries.reduce((a, e) => a + e.hours, 0);
  const billableHours = entries.filter(e => e.billable).reduce((a, e) => a + e.hours, 0);
  const billedHours = entries.filter(e => e.billed).reduce((a, e) => a + e.hours, 0);
  const unbilledAmount = entries.filter(e => e.billable && !e.billed).reduce((a, e) => a + e.amount, 0);

  const handleAdd = async () => {
    const caseId = form.caseId.trim();
    const caseTitle = form.caseTitle.trim();
    const task = form.task.trim();
    const hours = Number(form.hours); const rate = Number(form.rate);
    const billable = form.billable === 'Yes';
    const duplicateEntry = entries.some(e => e.lawyer === form.lawyer && e.caseId.toLowerCase() === caseId.toLowerCase() && e.task.toLowerCase() === task.toLowerCase() && e.date === new Date().toISOString().split('T')[0]);
    if (!caseId || !caseTitle || !task) {
      alert('Case ID, case title, aur task required hain.');
      return;
    }
    if (hours <= 0 || rate <= 0) {
      alert('Hours aur rate positive honay chahiye.');
      return;
    }
    if (duplicateEntry) {
      alert('Aaj ke din yeh time entry pehle se logged hai.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    await create({ title: form.lawyer, status: 'pending', date: today, amount: hours * rate, data: { entryId: `TE-${String(records.length + 1).padStart(3, '0')}`, caseId: form.caseId, caseTitle: form.caseTitle, task: form.task, hours, rate, amount: hours * rate, billable, date: today } });
    setShowModal(false);
    setForm({ lawyer: 'Adv. Rehman', caseId: '', caseTitle: '', task: '', hours: '', rate: '5000', billable: 'Yes' });
  };

  const markBilled = async (id: string) => { await update(id, { status: 'billed' }); };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>⏱️ Time Billing</h1>
          <p style={S.sub}>Track billable hours and time entries</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ Log Time</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Total Hours (Month)</div><div style={S.statVal}>{totalHours}h</div></div>
        <div style={S.stat}><div style={S.statLabel}>Billable Hours</div><div style={{ ...S.statVal, color: '#34d399' }}>{billableHours}h</div></div>
        <div style={S.stat}><div style={S.statLabel}>Billed Hours</div><div style={{ ...S.statVal, color: '#818cf8' }}>{billedHours}h</div></div>
        <div style={S.stat}><div style={S.statLabel}>Unbilled Amount</div><div style={{ ...S.statVal, color: '#fbbf24', fontSize: 22 }}>Rs. {unbilledAmount.toLocaleString()}</div></div>
      </div>

      <div style={S.filters}>
        <select style={S.filterSelect} value={lawyerFilter} onChange={e => setLawyerFilter(e.target.value)}>
          {LAWYERS.map(l => <option key={l}>{l}</option>)}
        </select>
        <select style={S.filterSelect} value={billableFilter} onChange={e => setBillableFilter(e.target.value)}>
          <option>All</option><option>Billable</option><option>Non-Billable</option>
        </select>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Date</th><th style={S.th}>Lawyer</th><th style={S.th}>Case</th>
            <th style={S.th}>Task</th><th style={S.th}>Hours</th><th style={S.th}>Amount</th>
            <th style={S.th}>Billable</th><th style={S.th}>Billed</th><th style={S.th}>Action</th>
          </tr></thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: 14 }}>No time entries found.</td></tr>
            )}
            {filtered.map(e => (
              <tr key={e.id}>
                <td style={S.td}>{e.date}</td>
                <td style={S.td}>{e.lawyer}</td>
                <td style={S.td}><div style={{ fontWeight: 600 }}>{e.caseTitle}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{e.caseId}</div></td>
                <td style={{ ...S.td, maxWidth: 180 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.task}</div></td>
                <td style={S.td}><strong>{e.hours}h</strong></td>
                <td style={S.td}>{e.billable ? `Rs. ${e.amount.toLocaleString()}` : '—'}</td>
                <td style={S.td}><span style={S.badge(e.billable ? '#34d399' : '#6b7280')}>{e.billable ? 'Yes' : 'No'}</span></td>
                <td style={S.td}><span style={S.badge(e.billed ? '#818cf8' : e.billable ? '#fbbf24' : '#6b7280')}>{e.billed ? 'Billed' : e.billable ? 'Pending' : '—'}</span></td>
                <td style={S.td}>{e.billable && !e.billed && <button style={{ ...S.actBtn, color: '#818cf8' }} onClick={() => markBilled(e.id)}>Mark Billed</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Log Time Entry</div>
            <div style={S.field}><label style={S.label}>Lawyer</label><select style={S.input} value={form.lawyer} onChange={e => setForm(p => ({ ...p, lawyer: e.target.value }))}>{LAWYERS.filter(l => l !== 'All').map(l => <option key={l}>{l}</option>)}</select></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Case ID</label><input style={S.input} value={form.caseId} onChange={e => setForm(p => ({ ...p, caseId: e.target.value }))} placeholder="CASE-XXX" /></div>
              <div style={S.field}><label style={S.label}>Case Title</label><input style={S.input} value={form.caseTitle} onChange={e => setForm(p => ({ ...p, caseTitle: e.target.value }))} /></div>
            </div>
            <div style={S.field}><label style={S.label}>Task Description</label><input style={S.input} value={form.task} onChange={e => setForm(p => ({ ...p, task: e.target.value }))} placeholder="What was done?" /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Hours</label><input type="number" style={S.input} value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} placeholder="2.5" /></div>
              <div style={S.field}><label style={S.label}>Rate / Hr (Rs.)</label><input type="number" style={S.input} value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} /></div>
            </div>
            <div style={S.field}><label style={S.label}>Billable</label><select style={S.input} value={form.billable} onChange={e => setForm(p => ({ ...p, billable: e.target.value }))}><option>Yes</option><option>No</option></select></div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Log Entry</button>
              <button style={{ ...S.actBtn, flex: 1, padding: '10px' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
