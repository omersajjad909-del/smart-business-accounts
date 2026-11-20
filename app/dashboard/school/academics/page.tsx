"use client";
import { useState, type ReactNode } from "react";
import { api, ErrorLine, Field, Modal, ui, useApi } from "../_ui";

type Data = { sessions: { id:string; name:string; startsOn:string; endsOn:string; active:boolean }[]; departments: { id:string; name:string; code:string|null }[]; programs: { id:string; name:string; code:string|null; duration:string|null; department:{name:string}|null; _count:{courses:number;enrollments:number} }[]; courses: { id:string; name:string; code:string|null; creditHours:number; program:{name:string}|null }[] };
const empty: Data = { sessions:[], departments:[], programs:[], courses:[] };

export default function AcademicsPage() {
  const { data, reload } = useApi<Data>("/api/school/academics", empty);
  const [type, setType] = useState<"session"|"department"|"program"|"course">("session");
  const [open, setOpen] = useState(false), [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<Record<string,string|boolean>>({ name:"", code:"", startsOn:"", endsOn:"", active:true, departmentId:"", programId:"", duration:"", creditHours:"3" });
  const resetForm = () => { setEditingId(""); setForm({ name:"", code:"", startsOn:"", endsOn:"", active:true, departmentId:"", programId:"", duration:"", creditHours:"3" }); };
  const save = async () => { const r = await api("/api/school/academics", { method: editingId ? "PATCH" : "POST", body:{ type, id:editingId || undefined, ...form } }); if (!r.ok) return setError(r.error); setOpen(false); setError(""); resetForm(); void reload(); };
  const openType = (t: typeof type) => { setType(t); setError(""); resetForm(); setOpen(true); };
  const edit = (t: typeof type, x: {id:string;name:string;code?:string|null}) => {
    setType(t); setEditingId(x.id); setError("");
    if (t === "session") {
      const s = data.sessions.find(v => v.id === x.id)!;
      setForm({ name:s.name, code:"", startsOn:s.startsOn.slice(0,10), endsOn:s.endsOn.slice(0,10), active:s.active });
    } else if (t === "department") setForm({ name:x.name, code:x.code || "" });
    else if (t === "program") { const p=data.programs.find(v=>v.id===x.id)!; setForm({ name:p.name, code:p.code || "", departmentId:"", duration:p.duration || "" }); }
    else { const c=data.courses.find(v=>v.id===x.id)!; setForm({ name:c.name, code:c.code || "", programId:"", creditHours:String(c.creditHours) }); }
    setOpen(true);
  };
  const remove = async (t: typeof type, id:string) => { if (!confirm("Delete this academic record?")) return; const r=await api(`/api/school/academics?type=${t}&id=${id}`,{method:"DELETE"}); if(!r.ok)setError(r.error); else void reload(); };
  return <div style={ui.page}>
    <div style={ui.head}><div><h1 style={ui.h1}>Academic Setup</h1><p style={ui.sub}>Set up sessions, departments, programs and courses for school, college or university.</p></div><button style={ui.btn} onClick={() => openType("session")}>+ Add academic record</button></div>
    <div style={ui.grid}>
      <Card title="Academic sessions" count={data.sessions.length} action={() => openType("session")}>{data.sessions.map(x => <Row key={x.id} title={x.name} sub={`${x.startsOn.slice(0,10)} — ${x.endsOn.slice(0,10)}${x.active ? " · Active" : ""}`} onEdit={()=>edit("session",x)} onDelete={()=>remove("session",x.id)} />)}</Card>
      <Card title="Departments" count={data.departments.length} action={() => openType("department")}>{data.departments.map(x => <Row key={x.id} title={x.name} sub={x.code || "No code"} onEdit={()=>edit("department",x)} onDelete={()=>remove("department",x.id)} />)}</Card>
      <Card title="Programs" count={data.programs.length} action={() => openType("program")}>{data.programs.map(x => <Row key={x.id} title={x.name} sub={`${x.department?.name || "No department"} · ${x.duration || "Duration not set"} · ${x._count.courses} courses`} onEdit={()=>edit("program",x)} onDelete={()=>remove("program",x.id)} />)}</Card>
      <Card title="Courses" count={data.courses.length} action={() => openType("course")}>{data.courses.map(x => <Row key={x.id} title={x.name} sub={`${x.code || "No code"} · ${x.creditHours} credit hours · ${x.program?.name || "Unassigned"}`} onEdit={()=>edit("course",x)} onDelete={()=>remove("course",x.id)} />)}</Card>
    </div>
    {open && <Modal title={`Add ${type}`} onClose={() => setOpen(false)}><ErrorLine text={error}/><Field label="Name"><input style={ui.input} value={String(form.name)} onChange={e=>setForm({...form,name:e.target.value})}/></Field>{type === "session" && <><Field label="Start date"><input type="date" style={ui.input} value={String(form.startsOn)} onChange={e=>setForm({...form,startsOn:e.target.value})}/></Field><Field label="End date"><input type="date" style={ui.input} value={String(form.endsOn)} onChange={e=>setForm({...form,endsOn:e.target.value})}/></Field><label style={ui.sub}><input type="checkbox" checked={Boolean(form.active)} onChange={e=>setForm({...form,active:e.target.checked})}/> Make current active session</label></>}{type !== "session" && <Field label="Code (optional)"><input style={ui.input} value={String(form.code)} onChange={e=>setForm({...form,code:e.target.value})}/></Field>}{type === "program" && <><Field label="Department"><select style={ui.input} value={String(form.departmentId)} onChange={e=>setForm({...form,departmentId:e.target.value})}><option value="">No department</option>{data.departments.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Duration"><input style={ui.input} placeholder="e.g. 4 years" value={String(form.duration)} onChange={e=>setForm({...form,duration:e.target.value})}/></Field></>}{type === "course" && <><Field label="Program"><select style={ui.input} value={String(form.programId)} onChange={e=>setForm({...form,programId:e.target.value})}><option value="">No program</option>{data.programs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Credit hours"><input type="number" min="0" step="0.5" style={ui.input} value={String(form.creditHours)} onChange={e=>setForm({...form,creditHours:e.target.value})}/></Field></>}<div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:16}}><button style={ui.ghost} onClick={()=>setOpen(false)}>Cancel</button><button style={ui.btn} onClick={save}>Save</button></div></Modal>}
  </div>;
}
function Card(p:{title:string;count:number;action:()=>void;children:ReactNode}) { return <section style={ui.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><strong>{p.title} ({p.count})</strong><button style={ui.ghost} onClick={p.action}>+ Add</button></div>{p.count ? p.children : <span style={ui.sub}>Nothing added yet.</span>}</section> }
function Row(p:{title:string;sub:string;onEdit:()=>void;onDelete:()=>void}) { return <div style={{padding:"8px 0",borderTop:"1px solid rgba(var(--ink),.08)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><div style={{fontSize:13,fontWeight:600}}>{p.title}</div><div style={ui.sub}>{p.sub}</div></div><div style={{display:"flex",gap:6}}><button style={{...ui.ghost,padding:"5px 8px"}} onClick={p.onEdit}>Edit</button><button style={{...ui.ghost,padding:"5px 8px",color:"#f87171"}} onClick={p.onDelete}>Delete</button></div></div></div> }
