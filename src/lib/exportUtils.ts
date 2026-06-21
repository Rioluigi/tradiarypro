import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Trade } from '@/types/trade';

// Renders equity line chart on an offscreen canvas and returns base64 PNG data URL
export function drawEquityCurveCanvas(trades: Trade[]): string | null {
  if (typeof window === 'undefined' || trades.length === 0) return null;

  const canvas = document.createElement('canvas');
  const W = 720;
  const H = 280;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Chart area margins
  const ML = 70;  // left margin (for Y-axis labels)
  const MR = 20;  // right margin
  const MT = 20;  // top margin
  const MB = 45;  // bottom margin (for X-axis labels)
  const chartW = W - ML - MR;
  const chartH = H - MT - MB;

  // ---- Background ----
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ---- Compute cumulative equity points ----
  const sorted = [...trades].sort(
    (a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
  );
  let cumulative = 0;
  const points: { x: number; y: number; date: string; value: number }[] = [
    { x: 0, y: 0, date: sorted[0] ? sorted[0].close_time : '', value: 0 },
  ];
  for (const t of sorted) {
    cumulative += Number(t.profit);
    points.push({
      x: points.length,
      y: cumulative,
      date: t.close_time,
      value: cumulative,
    });
  }

  if (points.length < 2) return null;

  const values = points.map((p) => p.y);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  // Add 10% vertical padding
  const paddedMin = minVal - valRange * 0.1;
  const paddedMax = maxVal + valRange * 0.1;
  const paddedRange = paddedMax - paddedMin || 1;

  // Map data to canvas coordinates
  const toCanvasX = (i: number) => ML + (i / (points.length - 1)) * chartW;
  const toCanvasY = (v: number) => MT + chartH - ((v - paddedMin) / paddedRange) * chartH;

  // ---- Grid lines ----
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  const numGridLines = 5;
  ctx.font = '10px Arial, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'right';

  for (let i = 0; i <= numGridLines; i++) {
    const gridVal = paddedMin + (paddedRange / numGridLines) * i;
    const gy = toCanvasY(gridVal);
    ctx.beginPath();
    ctx.moveTo(ML, gy);
    ctx.lineTo(W - MR, gy);
    ctx.stroke();

    // Y-axis labels
    const label = gridVal >= 1000 || gridVal <= -1000
      ? `${(gridVal / 1000).toFixed(1)}k`
      : gridVal.toFixed(gridVal === Math.floor(gridVal) ? 0 : 2);
    ctx.fillText(label, ML - 8, gy + 4);
  }

  // ---- Zero line (if visible) ----
  if (paddedMin < 0 && paddedMax > 0) {
    const zeroY = toCanvasY(0);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(ML, zeroY);
    ctx.lineTo(W - MR, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#6b7280';
    ctx.fillText('0', ML - 8, zeroY + 4);
  }

  // ---- X-axis date labels ----
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  ctx.font = '9px Arial, sans-serif';
  const maxDateLabels = Math.min(points.length, 8);
  const step = Math.max(1, Math.floor((points.length - 1) / (maxDateLabels - 1)));
  for (let i = 0; i < points.length; i += step) {
    const px = toCanvasX(i);
    const dateStr = points[i].date;
    if (dateStr) {
      const d = new Date(dateStr);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      ctx.fillText(label, px, H - MB + 16);
    }
    // Small tick mark
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, MT + chartH);
    ctx.lineTo(px, MT + chartH + 4);
    ctx.stroke();
  }

  // ---- Gradient fill under curve ----
  ctx.beginPath();
  ctx.moveTo(toCanvasX(0), MT + chartH);
  for (let i = 0; i < points.length; i++) {
    ctx.lineTo(toCanvasX(i), toCanvasY(points[i].y));
  }
  ctx.lineTo(toCanvasX(points.length - 1), MT + chartH);
  ctx.closePath();

  const lastVal = points[points.length - 1].y;
  const gradientColor = lastVal >= 0 ? [16, 185, 129] : [239, 68, 68]; // green or red
  const gradient = ctx.createLinearGradient(0, MT, 0, MT + chartH);
  gradient.addColorStop(0, `rgba(${gradientColor.join(',')}, 0.25)`);
  gradient.addColorStop(1, `rgba(${gradientColor.join(',')}, 0.02)`);
  ctx.fillStyle = gradient;
  ctx.fill();

  // ---- Main equity curve line ----
  const lineColor = lastVal >= 0 ? '#10b981' : '#ef4444'; // emerald or red
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const cx = toCanvasX(i);
    const cy = toCanvasY(points[i].y);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  // ---- Data point dots (only if ≤ 50 trades, otherwise too cluttered) ----
  if (points.length <= 50) {
    for (let i = 0; i < points.length; i++) {
      const cx = toCanvasX(i);
      const cy = toCanvasY(points[i].y);
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ---- Chart border ----
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.strokeRect(ML, MT, chartW, chartH);

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
  let nextSectionY = 76; // default if no chart

  if (chartImg) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Equity Curve', 15, 76);

    // Border around chart
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 79, 182, 72, 'S');
    doc.addImage(chartImg, 'PNG', 15, 80, 180, 70);
    nextSectionY = 160;
  }

  // Trades Table Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Recorded Trades', 15, nextSectionY);

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
    startY: nextSectionY + 4,
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
