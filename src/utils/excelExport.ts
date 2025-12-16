import * as XLSX from 'xlsx';

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  columns: ExcelColumn[];
  data: any[];
  title?: string;
  subtitle?: string;
}

export const exportToExcel = (options: ExcelExportOptions) => {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data with headers
    const headers = options.columns.map(col => col.header);
    const rows = options.data.map(item => 
      options.columns.map(col => item[col.key] || '')
    );
    
    // Add title and subtitle if provided
    const worksheetData = [];
    if (options.title) {
      worksheetData.push([options.title]);
      worksheetData.push([]); // Empty row
    }
    if (options.subtitle) {
      worksheetData.push([options.subtitle]);
      worksheetData.push([]); // Empty row
    }
    
    // Add headers and data
    worksheetData.push(headers);
    worksheetData.push(...rows);
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const colWidths = options.columns.map(col => ({ wch: col.width || 15 }));
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName);
    
    // Write file
    XLSX.writeFile(wb, `${options.filename}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Excel export error:', error);
    
    // Fallback to CSV
    const csvContent = createCSVFallback(options);
    downloadCSV(csvContent, options.filename);
    
    return false;
  }
};

const createCSVFallback = (options: ExcelExportOptions): string => {
  const BOM = '\uFEFF'; // UTF-8 BOM for Persian characters
  
  let csvContent = '';
  
  if (options.title) {
    csvContent += `${options.title}\n\n`;
  }
  if (options.subtitle) {
    csvContent += `${options.subtitle}\n\n`;
  }
  
  // Headers
  csvContent += options.columns.map(col => col.header).join(',') + '\n';
  
  // Data rows
  options.data.forEach(item => {
    const row = options.columns.map(col => {
      const value = item[col.key] || '';
      // Escape commas and quotes
      return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    });
    csvContent += row.join(',') + '\n';
  });
  
  return BOM + csvContent;
};

const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};