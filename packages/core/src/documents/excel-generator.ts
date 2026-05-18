import ExcelJS from 'exceljs';
import type { ExcelDocumentRequest } from '@quick-cowork/shared';

export async function generateExcel(request: ExcelDocumentRequest): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quick Cowork';
  workbook.created = new Date();

  for (const sheet of request.sheets) {
    const ws = workbook.addWorksheet(sheet.name);

    // Add header row
    ws.columns = sheet.columns.map((col) => ({
      header: col,
      key: col.toLowerCase().replace(/\s+/g, '_'),
      width: 20,
    }));

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const row of sheet.rows) {
      const rowData: Record<string, string | number> = {};
      sheet.columns.forEach((col, idx) => {
        rowData[col.toLowerCase().replace(/\s+/g, '_')] = row[idx] ?? '';
      });
      ws.addRow(rowData);
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
