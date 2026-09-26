// Every report prints through this wrapper. `display: contents` keeps it out of
// the screen layout; the print rules keyed on `.report-print-doc` in
// globals.css hide the dashboard chrome around it and turn the dark report
// into black ink on white paper, so no single report has to remember to.
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="report-print-doc" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
