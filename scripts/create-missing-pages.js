const fs = require('fs');

const pages = [
  ['app/dashboard/automotive/vehicles','🚗','Vehicle Stock','Manage your vehicle inventory — new, used, and in-transit units.'],
  ['app/dashboard/automotive/test-drives','🔑','Test Drives','Schedule and track customer test drives and follow-ups.'],
  ['app/dashboard/automotive/deals','🤝','Deals & Finance','Track vehicle deals, financing, and insurance arrangements.'],
  ['app/dashboard/workshop/jobs','🔧','Job Cards','Create and manage vehicle service and repair job cards.'],
  ['app/dashboard/workshop/parts','⚙️','Parts Used','Track parts consumed in workshop jobs with cost allocation.'],
  ['app/dashboard/workshop/mechanics','👷','Mechanics','Manage mechanics, their job assignments and performance.'],
  ['app/dashboard/workshop/warranty','✅','Warranty Jobs','Track warranty claims and warranty-covered repair jobs.'],
  ['app/dashboard/rental/bookings','📅','Vehicle Bookings','Manage car rental bookings, handover, and return schedules.'],
  ['app/dashboard/rental/agreements','📄','Rental Agreements','Create and store rental agreements with terms and conditions.'],
  ['app/dashboard/repair/jobs','🛠️','Repair Job Cards','Log all repair jobs with device details, fault, and status.'],
  ['app/dashboard/repair/parts','📦','Spare Parts','Manage spare parts inventory with usage tracking and alerts.'],
  ['app/dashboard/repair/warranty','✅','Warranty Tracking','Track warranty periods and distinguish warranty vs chargeable jobs.'],
  ['app/dashboard/repair/technicians','👷','Technicians','Manage technician assignments and revenue per technician.'],
  ['app/dashboard/maintenance/contracts','📋','AMC Contracts','Annual maintenance contracts — clients, scope, and renewal dates.'],
  ['app/dashboard/maintenance/schedule','📅','Service Schedule','Scheduled maintenance visits and preventive maintenance calendar.'],
  ['app/dashboard/maintenance/jobs','🔧','Service Jobs','Log service visits, work done, parts used, and billing.'],
  ['app/dashboard/maintenance/parts','⚙️','Parts & Stock','Spare parts and consumables inventory for maintenance operations.'],
  ['app/dashboard/media/campaigns','📢','Campaigns','Track advertising campaigns, clients, budgets, and deliverables.'],
  ['app/dashboard/media/clients','👥','Agency Clients','Manage client accounts, retainers, and campaign history.'],
  ['app/dashboard/media/media-plan','📺','Media Planning','Plan media placements — TV, digital, print, outdoor, radio.'],
  ['app/dashboard/printing/orders','🖨️','Print Orders','Manage print job orders with specs, quantities, and deadlines.'],
  ['app/dashboard/printing/paper-stock','📄','Paper & Ink Stock','Track paper, ink, and consumable inventory with reorder alerts.'],
  ['app/dashboard/printing/delivery','🚚','Delivery','Track print job deliveries and customer acknowledgements.'],
  ['app/dashboard/subscriptions/plans','📋','Subscription Plans','Manage subscription tiers, pricing, and feature sets.'],
  ['app/dashboard/subscriptions/subscribers','👥','Subscribers','View and manage all active and churned subscribers.'],
  ['app/dashboard/subscriptions/billing','🧾','Recurring Billing','Automated recurring invoice generation and payment tracking.'],
  ['app/dashboard/subscriptions/mrr','📈','MRR / ARR','Monthly and annual recurring revenue dashboard with growth trends.'],
  ['app/dashboard/isp/connections','🌐','Connections','Manage customer internet connections, packages, and status.'],
  ['app/dashboard/isp/billing','🧾','Monthly Bills','Generate and track monthly internet bills per customer.'],
  ['app/dashboard/isp/packages','📦','Packages','Define internet packages with speeds, quotas, and pricing.'],
  ['app/dashboard/isp/support','🎫','Support Tickets','Manage customer complaints and technical support requests.'],
  ['app/dashboard/solar/projects','☀️','Solar Projects','Track solar installation projects from survey to commissioning.'],
  ['app/dashboard/solar/equipment','🔋','Equipment Stock','Panels, inverters, batteries — inventory with reorder alerts.'],
  ['app/dashboard/solar/amc','📅','AMC Schedule','Annual maintenance contracts and scheduled service visits.'],
  ['app/dashboard/trade/shipments','🚢','Shipments','Track import and export shipments with status and ETA.'],
  ['app/dashboard/trade/lc','🏦','LC / TT','Manage letters of credit and telegraphic transfers per shipment.'],
  ['app/dashboard/trade/customs','🛃','Customs','Track customs clearance, duty payments, and port charges.'],
  ['app/dashboard/trade/costing','💰','Import Costing','Calculate landed cost per shipment including all charges.'],
  ['app/dashboard/events/bookings','🎪','Event Bookings','Manage event bookings with client details, date, and package.'],
  ['app/dashboard/events/vendors','🤝','Vendors','Manage caterers, decorators, photographers and other vendors.'],
  ['app/dashboard/events/budget','💰','Event Budget','Set and track budget vs actual cost for each event.'],
  ['app/dashboard/rentals/items','📦','Rental Items','Manage your rental equipment fleet with availability status.'],
  ['app/dashboard/rentals/bookings','📅','Bookings','Track rental bookings, deployments, and return schedules.'],
  ['app/dashboard/rentals/agreements','📄','Agreements','Rental agreements with terms, security deposits, and conditions.'],
  ['app/dashboard/rentals/maintenance','🔧','Maintenance','Schedule and track maintenance for rental equipment.'],
  ['app/dashboard/franchise/outlets','🏪','Outlets','Manage franchise outlets with performance metrics per branch.'],
  ['app/dashboard/franchise/royalty','🏅','Royalty','Calculate and track royalty amounts per franchise outlet.'],
  ['app/dashboard/firm/clients','👥','Clients','Manage firm clients with engagement history and contact info.'],
  ['app/dashboard/firm/projects','📁','Engagements','Track audit, accounting, or consulting engagements per client.'],
  ['app/dashboard/firm/billing','🧾','Fee Billing','Professional fee invoicing with time-based and fixed billing.'],
  ['app/dashboard/firm/timesheets','⏱️','Timesheets','Log billable hours per client, project, and team member.'],
];

let created = 0;
for (const [pagePath, icon, title, desc] of pages) {
  fs.mkdirSync(pagePath, { recursive: true });
  const file = pagePath + '/page.tsx';
  if (!fs.existsSync(file)) {
    const content = `export default function Page() {
  return (
    <div style={{ padding: "32px 24px", color: "var(--text-primary)", fontFamily: "inherit" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <span>${icon}</span> ${title}
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>${desc}</p>
      </div>
      <div style={{
        padding: "48px 32px", borderRadius: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>${icon}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 8 }}>${title}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 400, margin: "0 auto" }}>
          ${desc}
        </div>
      </div>
    </div>
  );
}
`;
    fs.writeFileSync(file, content);
    created++;
  }
}
console.log('Created ' + created + ' pages successfully');
