import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-adjust column widths based on header length or fixed value
    const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, 20)
    }));
    ws['!cols'] = colWidths;

    // Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    // Generate Excel file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};
