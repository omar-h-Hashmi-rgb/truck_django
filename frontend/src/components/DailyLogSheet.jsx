import { useState, useRef, useEffect, useCallback } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { FileText, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import ELDLogPDF from './ELDLogPDF';

const CANVAS_W = 800;
const CANVAS_H = 640;
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

const LEFT  = 80;
const RIGHT = 780;
const GRID_TOP = 200;
const ROW_H = 50;
const ROWS  = 4;
const COL_W = (RIGHT - LEFT) / 24;

const STATUS_ROWS = [
  { key: 'off_duty',            labelLines: ['1. Off Duty'],                y: GRID_TOP },
  { key: 'sleeper_berth',       labelLines: ['2. Sleeper Berth'],           y: GRID_TOP + ROW_H },
  { key: 'driving',             labelLines: ['3. Driving'],                 y: GRID_TOP + ROW_H * 2 },
  { key: 'on_duty_not_driving', labelLines: ['4. On Duty', '(Not Driving)'], y: GRID_TOP + ROW_H * 3 },
];

const STATUS_COLORS = {
  off_duty:            '#22c55e',
  sleeper_berth:       '#8b5cf6',
  driving:             '#ef4444',
  on_duty_not_driving: '#f59e0b',
};

function drawHeader(ctx, log, tripData, dayIndex) {
  ctx.save();
  const today = new Date();
  const logDate = new Date(today);
  logDate.setDate(today.getDate() + dayIndex);
  const dateStr = logDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 14px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText("Driver's Daily Log (FMCSA 49 CFR Part 395)", LEFT, 20);

  ctx.font = '11px -apple-system, sans-serif';

  const fields = [
    ['Date:', dateStr],
    ['From:', tripData.locations?.current?.name || tripData.current_location || '\u2014'],
    ['To:', tripData.locations?.dropoff?.name || tripData.dropoff_location || '\u2014'],
    ['Carrier:', 'Spotter Logistics'],
    ['Main Office:', '123 Freight Way, Dallas, TX 75201'],
    ['Truck/Tractor:', 'Truck #404'],
  ];

  fields.forEach(([label, value], i) => {
    const y = 42 + i * 18;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(label, LEFT, y);
    ctx.fillStyle = '#111827';
    ctx.fillText(value, LEFT + 90, y);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(LEFT + 90, y + 3);
    ctx.lineTo(RIGHT, y + 3);
    ctx.stroke();
  });

  const totalDriving = (tripData.trip_summary?.total_driving_hours) || 1;
  const milesToday = log.driving > 0
    ? Math.round((log.driving / totalDriving) * (tripData.trip_summary?.total_miles || 0))
    : 0;

  ctx.fillStyle = '#6b7280';
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillText('Total Miles Driving Today:', LEFT, 160);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 12px -apple-system, sans-serif';
  ctx.fillText(String(milesToday), LEFT + 175, 160);

  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('Vehicle Number:', LEFT + 300, 160);
  ctx.fillStyle = '#111827';
  ctx.fillText('Truck #404', LEFT + 400, 160);

  ctx.restore();
}

function drawGrid(ctx) {
  ctx.save();
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  ctx.strokeRect(LEFT, GRID_TOP, RIGHT - LEFT, ROWS * ROW_H);

  for (let i = 1; i < ROWS; i++) {
    const y = GRID_TOP + i * ROW_H;
    ctx.beginPath();
    ctx.moveTo(LEFT, y);
    ctx.lineTo(RIGHT, y);
    ctx.stroke();
  }

  for (let h = 0; h <= 24; h++) {
    const x = LEFT + h * COL_W;
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP);
    ctx.lineTo(x, GRID_TOP + ROWS * ROW_H);
    ctx.stroke();
  }

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 0.5;
  for (let h = 0; h < 24; h++) {
    const x = LEFT + (h + 0.5) * COL_W;
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP);
    ctx.lineTo(x, GRID_TOP + 6);
    ctx.stroke();
  }

  ctx.fillStyle = '#374151';
  ctx.font = '10px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  STATUS_ROWS.forEach((row) => {
    const lineHeight = ROW_H / row.labelLines.length;
    row.labelLines.forEach((line, li) => {
      ctx.fillText(line, LEFT - 6, row.y + lineHeight * li + lineHeight / 2);
    });
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = '9px -apple-system, sans-serif';
  for (let h = 0; h <= 24; h++) ctx.fillText(String(h), LEFT + h * COL_W, GRID_TOP - 3);

  ctx.fillStyle = '#374151';
  ctx.font = 'bold 10px -apple-system, sans-serif';
  ctx.fillText('Total', RIGHT + 30, GRID_TOP - 3);
  ctx.restore();
}

function drawDutyLine(ctx, events) {
  if (!events || events.length === 0) return;
  ctx.save();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  let prevRowIdx = null;

  events.forEach((evt) => {
    const rowIdx = STATUS_ROWS.findIndex((r) => r.key === evt.status);
    if (rowIdx === -1) return;
    const startHour = parseTimeToHours(evt.start_time);
    const endHour = Math.min(startHour + evt.duration_hours, 24);
    if (startHour >= 24) return;
    const y = STATUS_ROWS[rowIdx].y + 2;
    const x1 = LEFT + (startHour / 24) * (RIGHT - LEFT);
    const x2 = LEFT + (endHour / 24) * (RIGHT - LEFT);
    if (prevRowIdx !== null && prevRowIdx !== rowIdx) {
      const prevY = STATUS_ROWS[prevRowIdx].y + 2;
      ctx.beginPath();
      ctx.moveTo(x1, prevY);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    prevRowIdx = rowIdx;
  });
  ctx.restore();
}

function drawHourTotals(ctx, log) {
  ctx.save();
  ctx.font = 'bold 11px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const vals = [
    { key: 'off_duty', val: log.off_duty },
    { key: 'sleeper_berth', val: log.sleeper_berth },
    { key: 'driving', val: log.driving },
    { key: 'on_duty_not_driving', val: log.on_duty_not_driving },
  ];

  vals.forEach((v) => {
    const row = STATUS_ROWS.find((r) => r.key === v.key);
    if (!row) return;
    ctx.fillStyle = STATUS_COLORS[v.key];
    ctx.fillText(v.val.toFixed(1), RIGHT + 30, row.y + ROW_H / 2);
  });

  const total = log.driving + log.on_duty_not_driving + log.off_duty + log.sleeper_berth;
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px -apple-system, sans-serif';
  ctx.fillText(total.toFixed(1), RIGHT + 30, GRID_TOP + ROWS * ROW_H + 12);
  ctx.restore();
}

function drawRemarksSection(ctx, log, timelineEvents, yStart) {
  ctx.save();
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Remarks / Notes:', LEFT, yStart);
  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillStyle = '#374151';
  const remarks = buildRemarksList(log, timelineEvents);
  const text = remarks.length > 0 ? remarks.join('  |  ') : '\u2014';
  const wrapped = wrapText(ctx, text, RIGHT - LEFT);
  wrapped.forEach((line, i) => { if (i < 3) ctx.fillText(line, LEFT, yStart + 16 + i * 14); });
  ctx.restore();
}

function drawRecapTable(ctx, log, yStart) {
  ctx.save();
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('70-Hour / 8-Day Recap', LEFT, yStart);
  const recap = log.recap || {};
  const onDutyToday = log.driving + log.on_duty_not_driving;
  const fieldA = recap.field_a_7day_on_duty || 0;
  const fieldB = recap.field_b_available_tomorrow || 0;
  const fieldC = recap.field_c_8day_on_duty || 0;
  const tableTop = yStart + 10;
  const colWidths = [100, 100, 100, 100];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowH = 22;
  const headers = ['On Duty\nToday', 'A: 7-Day\nOn Duty', 'B: Avail.\nTomorrow', 'C: 8-Day\nOn Duty'];
  const values = [onDutyToday.toFixed(1), fieldA.toFixed(1), fieldB.toFixed(1), fieldC.toFixed(1)];

  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  ctx.strokeRect(LEFT, tableTop, tableWidth, rowH * 2);
  let cx = LEFT;
  for (let i = 0; i < colWidths.length - 1; i++) {
    cx += colWidths[i];
    ctx.beginPath(); ctx.moveTo(cx, tableTop); ctx.lineTo(cx, tableTop + rowH * 2); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(LEFT, tableTop + rowH); ctx.lineTo(LEFT + tableWidth, tableTop + rowH); ctx.stroke();

  ctx.font = '9px -apple-system, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  cx = LEFT;
  for (let i = 0; i < headers.length; i++) {
    const lines = headers[i].split('\n');
    lines.forEach((line, li) => ctx.fillText(line, cx + colWidths[i] / 2, tableTop + rowH * 0.3 + li * 10));
    cx += colWidths[i];
  }

  ctx.font = 'bold 11px -apple-system, sans-serif';
  ctx.fillStyle = '#111827';
  cx = LEFT;
  for (let i = 0; i < values.length; i++) {
    ctx.fillText(values[i], cx + colWidths[i] / 2, tableTop + rowH * 1.5);
    cx += colWidths[i];
  }
  ctx.restore();
}

function drawSignatureBlock(ctx, yStart) {
  ctx.save();
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText("Driver's Signature: ________________________    Date: ____________", LEFT, yStart);
  ctx.restore();
}

function parseTimeToHours(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
}

function buildRemarksList(log, timelineEvents) {
  if (!timelineEvents) return [];
  return timelineEvents
    .filter((e) => e.day === log.day && e.status !== 'driving')
    .map((e) => `${e.start_time || ''} - ${(e.remark || e.status).replace(/_/g, ' ')}`);
}

function wrapText(ctx, text, maxWidth) {
  const segments = text.split('  |  ');
  const lines = [];
  let current = '';
  segments.forEach((segment) => {
    const test = current ? current + '  |  ' + segment : segment;
    if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = segment; }
    else { current = test; }
  });
  if (current) lines.push(current);
  return lines;
}

export default function DailyLogSheet({ dailyLogs, timelineEvents, tripData }) {
  const canvasRef = useRef(null);
  const printContainerRef = useRef(null);
  const [activeDay, setActiveDay] = useState(0);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = CANVAS_W * DPR;
    canvas.height = CANVAS_H * DPR;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.scale(DPR, DPR);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const log = dailyLogs[activeDay];
    if (!log) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data for this day', CANVAS_W / 2, CANVAS_H / 2);
      return;
    }

    const dayEvents = (timelineEvents || []).filter((e) => e.day === log.day);
    drawHeader(ctx, log, tripData || {}, activeDay);
    drawGrid(ctx);
    drawDutyLine(ctx, dayEvents);
    drawHourTotals(ctx, log);
    drawRemarksSection(ctx, log, timelineEvents, GRID_TOP + ROWS * ROW_H + 30);
    drawRecapTable(ctx, log, GRID_TOP + ROWS * ROW_H + 80);
    drawSignatureBlock(ctx, CANVAS_H - 20);
  }, [dailyLogs, timelineEvents, tripData, activeDay]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  if (!dailyLogs || dailyLogs.length === 0) {
    return (
      <div className="border border-white/5 bg-[#090d16]/50 p-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-400" aria-hidden="true" />
          FMCSA Daily Log Sheets
        </h3>
        <div className="text-center py-12">
          <FileText className="h-10 w-10 mx-auto mb-3 text-slate-600" aria-hidden="true" />
          <p className="text-sm text-slate-500">No log data available</p>
          <p className="text-xs text-slate-600 mt-1">Plan a trip to generate ELD logs</p>
        </div>
      </div>
    );
  }

  const log = dailyLogs[activeDay];

  return (
    <div className="border border-white/5 bg-[#090d16]/50 p-8">
      <div className="flex items-center justify-between mb-4 no-print">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-400" aria-hidden="true" />
          FMCSA Daily Log Sheet
        </h3>

        <div className="flex items-center gap-3">
          <PDFDownloadLink
            document={<ELDLogPDF dailyLogs={dailyLogs} timelineEvents={timelineEvents} tripData={tripData} />}
            fileName="FMCSA_Daily_Log.pdf"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#02040a] bg-sky-400 rounded-none hover:bg-white transition-colors min-h-[44px] cursor-pointer active:scale-[0.97]"
          >
            {({ loading }) => (
              <>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {loading ? 'Generating...' : 'Export PDF'}
              </>
            )}
          </PDFDownloadLink>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveDay((d) => Math.max(0, d - 1))}
              disabled={activeDay === 0}
              className="p-2 rounded-none hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-[0.97]"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex gap-1">
              {dailyLogs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-none transition-colors min-h-[44px] flex items-center cursor-pointer active:scale-[0.97] ${
                    i === activeDay
                      ? 'bg-white text-[#02040a]'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                  aria-label={`Day ${i + 1}`}
                  aria-current={i === activeDay ? 'true' : undefined}
                >
                  Day {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveDay((d) => Math.min(dailyLogs.length - 1, d + 1))}
              disabled={activeDay === dailyLogs.length - 1}
              className="p-2 rounded-none hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-[0.97]"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div ref={printContainerRef} className="w-full max-w-4xl mx-auto overflow-x-auto overflow-y-hidden bg-white rounded-none">
        <div className="min-w-[800px] border border-gray-200 print-only">
          <canvas ref={canvasRef} aria-label={`FMCSA daily log for day ${activeDay + 1}: ${log.driving}h driving, ${log.off_duty}h off duty, ${log.sleeper_berth}h sleeper berth, ${log.on_duty_not_driving}h on duty not driving`} role="img" />
        </div>
      </div>

      {log && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          <Badge label="Off Duty" hours={log.off_duty} color="bg-green-500/10 text-green-400 border-green-500/20" />
          <Badge label="Sleeper" hours={log.sleeper_berth} color="bg-purple-500/10 text-purple-400 border-purple-500/20" />
          <Badge label="Driving" hours={log.driving} color="bg-red-500/10 text-red-400 border-red-500/20" />
          <Badge label="On Duty" hours={log.on_duty_not_driving} color="bg-amber-500/10 text-amber-400 border-amber-500/20" />
        </div>
      )}
    </div>
  );
}

function Badge({ label, hours, color }) {
  return (
    <div className={`rounded-none border px-3 py-2 text-center ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">{label}</p>
      <p className="text-lg font-bold tabular-nums">{hours.toFixed(1)}h</p>
    </div>
  );
}
