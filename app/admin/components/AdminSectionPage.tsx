"use client";

type SectionStat = {
  label: string;
  value: string;
  helper: string;
};

type SectionListItem = {
  title: string;
  detail: string;
  badge?: string;
};

type AdminSectionPageProps = {
  title: string;
  subtitle: string;
  primaryAction: string;
  secondaryAction: string;
  stats: SectionStat[];
  managementTitle: string;
  managementItems: SectionListItem[];
  summaryTitle: string;
  summaryPoints: string[];
  activityTitle: string;
  activityItems: SectionListItem[];
};

export default function AdminSectionPage(props: AdminSectionPageProps) {
  return (
    <div className="admin-section-page">
      <style>{styles}</style>

      <section className="section-header">
        <div>
          <h1>{props.title}</h1>
          <p>{props.subtitle}</p>
        </div>
        <div className="section-actions">
          <button type="button" className="secondary-btn">{props.secondaryAction}</button>
          <button type="button" className="primary-btn">{props.primaryAction}</button>
        </div>
      </section>

      <section className="section-stats">
        {props.stats.map((stat) => (
          <article key={stat.label} className="surface stat-tile">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.helper}</small>
          </article>
        ))}
      </section>

      <section className="section-grid">
        <article className="surface">
          <div className="surface-head">
            <h2>{props.managementTitle}</h2>
            <span>Configured</span>
          </div>
          <div className="stack-list">
            {props.managementItems.map((item) => (
              <div key={item.title} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                {item.badge ? <span className="soft-badge">{item.badge}</span> : null}
              </div>
            ))}
          </div>
        </article>

        <article className="surface">
          <div className="surface-head">
            <h2>{props.summaryTitle}</h2>
            <span>Summary</span>
          </div>
          <div className="summary-ring">
            <div>
              <strong>100%</strong>
              <small>Complete</small>
            </div>
          </div>
          <ul className="point-list">
            {props.summaryPoints.map((point) => (
              <li key={point}>
                <span>{point}</span>
                <b>Ready</b>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="surface">
        <div className="surface-head">
          <h2>{props.activityTitle}</h2>
          <span>Latest</span>
        </div>
        <div className="activity-list">
          {props.activityItems.map((item) => (
            <div key={item.title} className="activity-row">
              <span className="activity-bullet" />
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              {item.badge ? <span className="soft-badge">{item.badge}</span> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles = `
.admin-section-page{
  display:grid;
  gap:18px;
}
.surface{
  padding:18px;
  border-radius:22px;
  border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(180deg, rgba(19,27,46,.98), rgba(15,22,39,.96));
  box-shadow:0 24px 70px rgba(3,6,18,.22);
}
.section-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
}
.section-header h1{
  margin:0;
  font-size:32px;
  font-weight:800;
  letter-spacing:-.05em;
}
.section-header p{
  margin:6px 0 0;
  color:rgba(203,213,225,.72);
  font-size:14px;
}
.section-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.primary-btn,.secondary-btn{
  padding:12px 16px;
  border-radius:14px;
  font:inherit;
  font-size:13px;
  font-weight:700;
  cursor:pointer;
}
.primary-btn{
  border:none;
  background:linear-gradient(135deg, #6d28d9, #8b5cf6);
  color:#fff;
}
.secondary-btn{
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.04);
  color:#e2e8f0;
}
.section-stats{
  display:grid;
  grid-template-columns:repeat(4, minmax(0,1fr));
  gap:16px;
}
.stat-tile span{
  color:rgba(203,213,225,.72);
  font-size:13px;
}
.stat-tile strong{
  display:block;
  margin-top:10px;
  font-size:32px;
  line-height:1;
  letter-spacing:-.05em;
}
.stat-tile small{
  display:block;
  margin-top:8px;
  color:#86efac;
  font-size:12px;
  font-weight:700;
}
.section-grid{
  display:grid;
  grid-template-columns:1.2fr .9fr;
  gap:16px;
}
.surface-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:16px;
}
.surface-head h2{
  margin:0;
  font-size:21px;
}
.surface-head span{
  color:#bca9ff;
  font-size:12px;
  font-weight:700;
}
.stack-list,.activity-list{
  display:grid;
  gap:12px;
}
.list-row,.activity-row{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  padding:14px;
  border-radius:16px;
  background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.06);
}
.list-row strong,.activity-row strong{
  display:block;
  font-size:14px;
}
.list-row p,.activity-row p{
  margin:6px 0 0;
  color:rgba(203,213,225,.64);
  font-size:12px;
  line-height:1.5;
}
.soft-badge{
  align-self:center;
  padding:6px 10px;
  border-radius:999px;
  background:rgba(124,58,237,.18);
  color:#d8ccff;
  font-size:11px;
  font-weight:700;
  white-space:nowrap;
}
.summary-ring{
  width:170px;
  height:170px;
  margin:6px auto 18px;
  border-radius:50%;
  background:conic-gradient(#8b5cf6 0 360deg);
  display:grid;
  place-items:center;
  position:relative;
}
.summary-ring::after{
  content:"";
  position:absolute;
  width:124px;
  height:124px;
  border-radius:50%;
  background:#0f1729;
}
.summary-ring > div{
  position:relative;
  z-index:1;
  display:grid;
  text-align:center;
}
.summary-ring strong{
  font-size:30px;
}
.summary-ring small{
  color:rgba(203,213,225,.7);
}
.point-list{
  list-style:none;
  padding:0;
  margin:0;
  display:grid;
  gap:10px;
}
.point-list li{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  color:#e2e8f0;
  font-size:13px;
}
.point-list b{
  color:#86efac;
}
.activity-row{
  align-items:center;
}
.activity-bullet{
  width:10px;
  height:10px;
  border-radius:999px;
  background:#8b5cf6;
  flex-shrink:0;
}

@media (max-width: 1100px){
  .section-stats{
    grid-template-columns:repeat(2, minmax(0,1fr));
  }
  .section-grid{
    grid-template-columns:1fr;
  }
}

@media (max-width: 640px){
  .section-header h1{
    font-size:27px;
  }
  .section-stats{
    grid-template-columns:1fr;
  }
  .list-row,.activity-row{
    flex-direction:column;
    align-items:flex-start;
  }
}
`;
