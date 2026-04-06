import toast from "react-hot-toast";
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
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: (a: boolean) => ({ background: a ? '#92400e' : 'rgba(255,255,255,.06)', color: a ? '#fff' : 'rgba(255,255,255,.6)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }),
  grid: { display: 'grid', gap: 16 },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 24 },
  caseTitle: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 16 },
  infoItem: { background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '10px 12px' },
  infoLabel: { fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 },
  infoVal: { fontSize: 14, fontWeight: 600 },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
  actBtn: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' },
};

const CASE_TYPES = ['Civil', 'Criminal', 'Corporate', 'Family', 'Property', 'Labour'];
const STATUS_COLOR: Record<string, string> = { Active: '#34d399', Pending: '#fbbf24', Closed: '#6b7280', Won: '#818cf8', Lost: '#f87171' };
const TYPE_COLOR: Record<string, string> = { Civil: '#38bdf8', Criminal: '#f87171', Corporate: '#818cf8', Family: '#db2777', Property: '#fbbf24', Labour: '#34d399' };

export default function CasesPage() {
  const { records, loading, create } = useBusinessRecords('legal_case');
  const [tab, setTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', client: '', type: 'Civil', court: '', fileDate: '', nextHearing: '', lawyer: '', status: 'Active' });
  const [todayTs] = useState(() => Date.now());

  const cases = records.map(r => ({
    id: r.id,
    caseNo: (r.data?.caseNo as string) || r.id,
    title: r.title,
    client: (r.data?.client as string) || '',
    type: (r.data?.type as string) || 'Civil',
    court: (r.data?.court as string) || '',
    fileDate: r.date || (r.data?.fileDate as string) || '',
    nextHearing: (r.data?.nextHearing as string) || '',
    status: r.status || 'Active',
    lawyer: (r.data?.lawyer as string) || '',
  }));

  const filtered = tab === 'All' ? cases : cases.filter(c => c.status === tab);
  const active = cases.filter(c => c.status === 'Active').length;
  const hearingsThisWeek = cases.filter(c => { const d = new Date(c.nextHearing); const now = new Date(); return d >= now && (d.getTime() - now.getTime()) < 7 * 86400000; }).length;
  const won = cases.filter(c => c.status === 'Won').length;

  const handleAdd = async () => {
    const title = form.title.trim();
    const client = form.client.trim();
    const court = form.court.trim();
    const lawyer = form.lawyer.trim();
    const duplicateCase = cases.some(c => c.title.toLowerCase() === title.toLowerCase() && c.client.toLowerCase() === client.toLowerCase());
    if (!title || !client || !court || !form.fileDate || !lawyer) {
      toast.success('Case title, client, court, file date, aur assigned lawyer required hain.');
      return;
    }
    if (duplicateCase) {
      toast('Is client ke liye yeh case pehle se maujood hai.');
      return;
    }
    if (form.nextHearing && new Date(form.nextHearing) < new Date(form.fileDate)) {
      toast('Next hearing file date se pehle nahi ho sakti.');
      return;
    }
    await create({ title: form.title, status: form.status, date: form.fileDate, data: { caseNo: `CASE-${String(records.length + 1).padStart(3, '0')}`, client: form.client, type: form.type, court: form.court, fileDate: form.fileDate, nextHearing: form.nextHearing, lawyer: form.lawyer } });
    setShowModal(false);
    setForm({ title: '', client: '', type: 'Civil', court: '', fileDate: '', nextHearing: '', lawyer: '', status: 'Active' });
  };

  const daysUntil = (dateStr: string) => {
    if (!dateStr || dateStr === '—') return null;
    const diff = Math.round((new Date(dateStr).getTime() - todayTs) / 86400000);
    return diff;
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>⚖️ Cases</h1>
          <p style={S.sub}>Manage all legal cases and hearings</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ New Case</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Active Cases</div><div style={{ ...S.statVal, color: '#34d399' }}>{active}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Hearings Next 7 Days</div><div style={{ ...S.statVal, color: '#fbbf24' }}>{hearingsThisWeek}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Won This Year</div><div style={{ ...S.statVal, color: '#818cf8' }}>{won}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Total Clients</div><div style={S.statVal}>{new Set(cases.map(c => c.client)).size}</div></div>
      </div>

      <div style={S.tabs}>
        {['All', 'Active', 'Pending', 'Won', 'Closed'].map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t} ({t === 'All' ? cases.length : cases.filter(c => c.status === t).length})</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.grid}>
        {!loading && filtered.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.25)' }}>No cases found.</div>
        )}
        {filtered.map(c => {
          const days = daysUntil(c.nextHearing);
          return (
            <div key={c.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={S.caseTitle}>{c.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{c.caseNo} · {c.court}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <span style={S.badge(TYPE_COLOR[c.type] || '#818cf8')}>{c.type}</span>
                  <span style={S.badge(STATUS_COLOR[c.status])}>{c.status}</span>
                </div>
              </div>
              <div style={S.infoGrid}>
                <div style={S.infoItem}><div style={S.infoLabel}>Client</div><div style={S.infoVal}>{c.client}</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Lawyer</div><div style={S.infoVal}>{c.lawyer}</div></div>
                <div style={S.infoItem}><div style={S.infoLabel}>Filed</div><div style={S.infoVal}>{c.fileDate}</div></div>
              </div>
              {days !== null && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: days <= 3 ? 'rgba(248,113,113,.1)' : 'rgba(251,191,36,.08)', borderRadius: 8, fontSize: 13 }}>
                  ⚖️ Next hearing: <strong>{c.nextHearing}</strong> — <span style={{ color: days <= 3 ? '#f87171' : '#fbbf24' }}>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today!' : `in ${days} days`}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>New Case</div>
            <div style={S.field}><label style={S.label}>Case Title</label><input style={S.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Claimant vs. Respondent" /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Client</label><input style={S.input} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Case Type</label><select style={S.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{CASE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div style={S.field}><label style={S.label}>Court</label><input style={S.input} value={form.court} onChange={e => setForm(p => ({ ...p, court: e.target.value }))} placeholder="District Court Karachi" /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>File Date</label><input type="date" style={S.input} value={form.fileDate} onChange={e => setForm(p => ({ ...p, fileDate: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Next Hearing</label><input type="date" style={S.input} value={form.nextHearing} onChange={e => setForm(p => ({ ...p, nextHearing: e.target.value }))} /></div>
            </div>
            <div style={S.field}><label style={S.label}>Assigned Lawyer</label><input style={S.input} value={form.lawyer} onChange={e => setForm(p => ({ ...p, lawyer: e.target.value }))} placeholder="Adv. Name" /></div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Save Case</button>
              <button style={{ ...S.actBtn, flex: 1, padding: '10px' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
