import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Trade } from '@/types/trade';

// Renders a beautiful equity line chart on a hidden canvas and returns base64 PNG data URL
export function drawEquityCurveCanvas(trades: Trade[]): string | null {
  if (typeof window === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Dark background matching the app's premium dark mode theme
  ctx.fillStyle = '#0f0f11';
  ctx.fillRect(0, 0, 600, 220);

  // Subtle grid lines
  ctx.strokeStyle = '#1c1c1e';
  ctx.lineWidth = 1;
  for (let i = 50; i < 600; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 220);
    ctx.stroke();
  }
  for (let i = 40; i < 220; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(600, i);
    ctx.stroke();
  }

  // Calculate cumulative equity points starting from 0
  const sorted = [...trades].sort((a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime());
  let currentBalance = 0;
  const points = [0];
  for (const t of sorted) {
    currentBalance += Number(t.profit);
    points.push(currentBalance);
  }

  if (points.length < 2) return canvas.toDataURL('image/png');

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const valRange = maxVal - minVal || 1;

  // Draw gradient area under the curve first
  ctx.beginPath();
  ctx.moveTo(15, 210); // Start bottom-left
  for (let i = 0; i < points.length; i++) {
    const x = (i / (points.length - 1)) * 570 + 15;
    const y = 200 - ((points[i] - minVal) / valRange) * 180;
    ctx.lineTo(x, y);
  }
  ctx.lineTo((points.length - 1) / (points.length - 1) * 570 + 15, 210); // Bottom-right
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.25)'); // Indigo accent
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw accent equity curve line
  ctx.strokeStyle = '#4f46e5'; // accent indigo
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = (i / (points.length - 1)) * 570 + 15;
    const y = 200 - ((points[i] - minVal) / valRange) * 180;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

// Compile and export PDF report
export function exportToPDF(
  trades: Trade[],
  accountLabel: string,
  dateRangeStr: string,
  formatCurrency: (v: number) => string
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageHeight = doc.internal.pageSize.height;

  // Calculations
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit <= 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  
  const totalProfit = wins.reduce((acc, t) => acc + Number(t.profit), 0);
  const totalLoss = losses.reduce((acc, t) => acc + Math.abs(Number(t.profit)), 0);
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 99.9 : 0;
  const totalPL = trades.reduce((acc, t) => acc + Number(t.profit), 0);

  // Helper to draw clean logo mark
  const drawHeader = () => {
    // Top Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 24, 'F');
    
    // Logo text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('TRADIARY', 15, 15);
    
    // Logo accent dot
    doc.setFillColor(79, 70, 229); // Indigo
    doc.circle(50, 13, 1.5, 'FD');

    // Report title
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Trading Performance Report', 145, 15);
  };

  drawHeader();

  // Meta information
  doc.setTextColor(15, 23, 42); // dark slate
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Account Summary', 15, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Account Name: `, 15, 43);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(accountLabel, 40, 43);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date Range: `, 125, 43);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(dateRangeStr, 145, 43);

  // Performance Stats Box Layout (2x2 Grid)
  const drawStatBox = (label: string, value: string, isPositive: boolean | null, x: number, y: number, w: number, h: number) => {
    doc.setFillColor(248, 250, 252); // grey-50 bg
    doc.setDrawColor(226, 232, 240); // grey-200 border
    doc.rect(x, y, w, h, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    if (isPositive === true) doc.setTextColor(16, 185, 129); // green
    else if (isPositive === false) doc.setTextColor(239, 68, 68); // red
    else doc.setTextColor(15, 23, 42); // slate
    doc.text(value, x + 4, y + 14);
  };

  const startY = 48;
  drawStatBox('Total Net Profit', formatCurrency(totalPL), totalPL >= 0, 15, startY, 42, 20);
  drawStatBox('Win Rate', `${winRate.toFixed(1)}%`, null, 62, startY, 42, 20);
  drawStatBox('Profit Factor', profitFactor.toFixed(2), null, 109, startY, 42, 20);
  drawStatBox('Total Trades', String(totalTrades), null, 156, startY, 39, 20);

  // Render & Insert Equity Curve
  const chartImg = drawEquityCurveCanvas(trades);
  if (chartImg) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Equity Curve', 15, 76);

    // Border around chart
    doc.setDrawColor(241, 245, 249);
    doc.rect(14, 80, 182, 62, 'S');
    doc.addImage(chartImg, 'PNG', 15, 81, 180, 60);
  }

  // Trades Table Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Recorded Trades', 15, 151);

  const tableHeaders = ['Ticket', 'Symbol', 'Type', 'Vol', 'Profit', 'Open Time', 'Close Time'];
  const tableRows = trades.map((t) => [
    String(t.ticket),
    t.symbol,
    t.type,
    t.volume.toFixed(2),
    formatCurrency(Number(t.profit)),
    new Date(t.open_time).toISOString().split('T')[0],
    new Date(t.close_time).toISOString().split('T')[0]
  ]);

  autoTable(doc, {
    startY: 155,
    head: [tableHeaders],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      4: { fontStyle: 'bold', halign: 'right' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        // Retrieve corresponding raw profit value to determine color
        const rowTrade = trades[data.row.index];
        if (rowTrade && Number(rowTrade.profit) >= 0) {
          data.cell.styles.textColor = [16, 185, 129]; // green
        } else {
          data.cell.styles.textColor = [239, 68, 68]; // red
        }
      }
    },
    didDrawPage: () => {
      // Draw footer on each page
      doc.setFillColor(241, 245, 249); // slate-100 line
      doc.rect(15, pageHeight - 15, 180, 0.2, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Generated by Tradiary Pro Journal', 15, pageHeight - 10);
      
      const pageStr = `Page ${doc.getNumberOfPages()}`;
      doc.text(pageStr, 185, pageHeight - 10);
    }
  });

  const formattedDate = new Date().toISOString().split('T')[0];
  doc.save(`tradiary-report-${formattedDate}.pdf`);
}

// Compile and export Excel spreadsheet (.xlsx) with multi-sheet
export function exportToExcel(
  trades: Trade[],
  accountLabel: string,
  dateRangeStr: string
) {
  // Sheet 1: Raw Trades Data
  const sheet1Data = trades.map((t) => ({
    Ticket: t.ticket,
    Symbol: t.symbol,
    Type: t.type,
    Volume: t.volume,
    'Open Price': t.open_price,
    'Close Price': t.close_price,
    'Open Time': t.open_time,
    'Close Time': t.close_time,
    Profit: t.profit,
    Commission: t.commission || 0
  }));
  const wsTrades = XLSX.utils.json_to_sheet(sheet1Data);

  // Auto-fit column widths for Sheet 1
  const colsW = [{ wch: 12 }, { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 10 }];
  wsTrades['!cols'] = colsW;

  // Sheet 2: Summary Stats calculations
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit <= 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  
  const totalProfit = wins.reduce((acc, t) => acc + Number(t.profit), 0);
  const totalLoss = losses.reduce((acc, t) => acc + Math.abs(Number(t.profit)), 0);
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 99.9 : 0;
  const totalPL = trades.reduce((acc, t) => acc + Number(t.profit), 0);
  const avgWin = wins.length > 0 ? totalProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;

  const sheet2Data = [
    ['METADATA', 'VALUE'],
    ['Account Name', accountLabel],
    ['Date Range', dateRangeStr],
    ['Exported Date', new Date().toLocaleString()],
    [],
    ['PERFORMANCE STATISTICS', 'VALUE'],
    ['Total Net Profit', totalPL],
    ['Win Rate', `${winRate.toFixed(2)}%`],
    ['Profit Factor', profitFactor],
    ['Total Trades', totalTrades],
    ['Winning Trades', wins.length],
    ['Losing Trades', losses.length],
    ['Average Win Trade', avgWin],
    ['Average Loss Trade', avgLoss]
  ];
  const wsStats = XLSX.utils.aoa_to_sheet(sheet2Data);

  // Fit column widths for Sheet 2
  wsStats['!cols'] = [{ wch: 25 }, { wch: 30 }];

  // Assemble Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsTrades, 'Trades data');
  XLSX.utils.book_append_sheet(wb, wsStats, 'Summary stats');

  // Trigger Save
  const formattedDate = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `tradiary-trades-${formattedDate}.xlsx`);
}
