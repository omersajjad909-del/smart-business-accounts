"use client";

import toast from "react-hot-toast";
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
  filters: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' as const },
  tab: (a: boolean) => ({ background: a ? '#7c3aed' : 'rgba(255,255,255,.06)', color: a ? '#fff' : 'rgba(255,255,255,.6)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }),
  filterSelect: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,.5)', borderBottom: '1px solid rgba(255,255,255,.07)', fontWeight: 600 },
  td: { padding: '14px 16px', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,.04)' },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  priorityDot: (c: string) => ({ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, marginRight: 6 }),
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
  actBtn: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
};

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const CATEGORIES = ['Bug', 'Feature Request', 'Configuration', 'Training', 'General'];
const PRIORITY_COLOR: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#38bdf8', Low: '#6b7280' };
const STATUS_COLOR: Record<string, string> = { Open: '#f87171', 'In Progress': '#38bdf8', 'Waiting Client': '#fbbf24', Resolved: '#34d399', Closed: '#6b7280' };
const STATUSES = ['Open', 'In Progress', 'Waiting Client', 'Resolved', 'Closed'];
const AGENTS = ['Ahmed K.', 'Sara M.', 'Bilal R.', 'Zara H.'];

export default function SupportPage() {
  const { records, loading, create, update } = useBusinessRecords('support_ticket');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', client: '', project: '', priority: 'Medium', category: 'Bug', assigned: 'Ahmed K.' });

  const tickets = records.map(r => ({
    id: r.id,
    ticketId: (r.data?.ticketId as string) || r.id,
    title: r.title,
    client: (r.data?.client as string) || '',
    project: (r.data?.project as string) || '',
    priority: (r.data?.priority as string) || 'Medium',
    category: (r.data?.category as string) || 'General',
    created: r.date || (r.data?.created as string) || '',
    assigned: (r.data?.assigned as string) || '',
    updated: (r.data?.updated as string) || '',
    status: r.status || 'Open',
  }));

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    return true;
  });

  const today = new Date().toISOString().split('T')[0];
  const open = tickets.filter(t => t.status === 'Open').length;
  const critical = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;
  const resolved = tickets.filter(t => t.status === 'Resolved' && t.updated === today).length;

  const updateStatus = async (id: string, status: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    if (ticket.status === 'Closed') {
      toast('Closed ticket ko directly change nahi kiya ja sakta.');
      return;
    }
    await update(id, { status, data: { updated: today } });
  };

  const handleAdd = async () => {
    const title = form.title.trim();
    const client = form.client.trim();
    const project = form.project.trim();
    const duplicateTicket = tickets.some(t => t.title.toLowerCase() === title.toLowerCase() && t.client.toLowerCase() === client.toLowerCase() && t.status !== 'Closed');
    if (!title || !client || !project) {
      toast.error('Title, client, aur project required hain.');
      return;
    }
    if (duplicateTicket) {
      toast.error('Yeh ticket already open hai.');
      return;
    }
    await create({ title: form.title, status: 'Open', date: today, data: { ticketId: `TKT-${String(records.length + 1).padStart(3, '0')}`, client: form.client, project: form.project, priority: form.priority, category: form.category, assigned: form.assigned, created: today, updated: today } });
    setShowModal(false);
    setForm({ title: '', client: '', project: '', priority: 'Medium', category: 'Bug', assigned: 'Ahmed K.' });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🎫 Support Tickets</h1>
          <p style={S.sub}>Client tech support and issue tracking</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ New Ticket</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Open Tickets</div><div style={{ ...S.statVal, color: '#f87171' }}>{open}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Critical Issues</div><div style={{ ...S.statVal, color: '#ef4444' }}>{critical}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Avg Response</div><div style={{ ...S.statVal, color: '#38bdf8' }}>2.4h</div></div>
        <div style={S.stat}><div style={S.statLabel}>Resolved Today</div><div style={{ ...S.statVal, color: '#34d399' }}>{resolved}</div></div>
      </div>

      <div style={{ ...S.filters, marginBottom: 12 }}>
        <button style={S.tab(statusFilter === 'All')} onClick={() => setStatusFilter('All')}>All</button>
        {STATUSES.map(s => <button key={s} style={S.tab(statusFilter === s)} onClick={() => setStatusFilter(s)}>{s}</button>)}
        <select style={S.filterSelect} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="All">All Priority</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Ticket</th><th style={S.th}>Title</th><th style={S.th}>Client</th>
            <th style={S.th}>Priority</th><th style={S.th}>Category</th><th style={S.th}>Assigned</th>
            <th style={S.th}>Updated</th><th style={S.th}>Status</th><th style={S.th}>Action</th>
          </tr></thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: 14 }}>No tickets found.</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id}>
                <td style={S.td}><div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.ticketId}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{t.created}</div></td>
                <td style={{ ...S.td, maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{t.project}</div></td>
                <td style={S.td}>{t.client}</td>
                <td style={S.td}><span><span style={S.priorityDot(PRIORITY_COLOR[t.priority])} />{t.priority}</span></td>
                <td style={S.td}>{t.category}</td>
                <td style={S.td}>{t.assigned}</td>
                <td style={S.td}>{t.updated}</td>
                <td style={S.td}><span style={S.badge(STATUS_COLOR[t.status])}>{t.status}</span></td>
                <td style={S.td}>
                  <select style={{ ...S.filterSelect, padding: '4px 8px', fontSize: 12 }} value={t.status} onChange={e => updateStatus(t.id, e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>New Support Ticket</div>
            <div style={S.field}><label style={S.label}>Title</label><input style={S.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Describe the issue briefly" /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Client</label><input style={S.input} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Project</label><input style={S.input} value={form.project} onChange={e => setForm(p => ({ ...p, project: e.target.value }))} /></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Priority</label><select style={S.input} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
              <div style={S.field}><label style={S.label}>Category</label><select style={S.input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div style={S.field}><label style={S.label}>Assign To</label><select style={S.input} value={form.assigned} onChange={e => setForm(p => ({ ...p, assigned: e.target.value }))}>{AGENTS.map(a => <option key={a}>{a}</option>)}</select></div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Create Ticket</button>
              <button style={{ ...S.actBtn, flex: 1, padding: '10px' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
