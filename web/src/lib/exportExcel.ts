import * as XLSX from "xlsx";

export function downloadExcel(rows: Record<string, any>[], filename: string) {
  if (rows.length === 0) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nuk ka të dhëna"]]), "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns based on content
  const keys = Object.keys(rows[0]);
  ws["!cols"] = keys.map((key) => {
    const headerLen = key.length;
    const maxDataLen = rows.reduce((max, row) => {
      const val = row[key];
      const len = val == null ? 0 : String(val).length;
      return Math.max(max, len);
    }, 0);
    return { wch: Math.min(Math.max(headerLen, maxDataLen) + 2, 40) };
  });

  // Freeze the header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
