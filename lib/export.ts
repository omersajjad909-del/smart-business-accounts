// Excel/CSV Export Utility Functions

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = headers.join(",") + "\n";
  
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) return "";
      // Handle objects/arrays
      if (typeof value === "object") return JSON.stringify(value);
      // Escape commas and quotes
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvContent += values.join(",") + "\n";
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(data: any[], filename: string) {
  // For Excel, we'll use CSV format (works in Excel)
  // For proper Excel, you'd need a library like xlsx
  exportToCSV(data, filename);
}

export function exportTableToCSV(tableId: string, filename: string) {
  const table = document.getElementById(tableId) as HTMLTableElement;
  if (!table) {
    alert("Table not found");
    return;
  }

  let csvContent = "";
  
  // Get headers
  const headers = Array.from(table.querySelectorAll("thead th")).map(
    (th) => th.textContent?.trim() || ""
  );
  csvContent += headers.join(",") + "\n";

  // Get rows
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td")).map((td) => {
      const text = td.textContent?.trim() || "";
      if (text.includes(",") || text.includes('"') || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    });
    csvContent += cells.join(",") + "\n";
  });

  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
