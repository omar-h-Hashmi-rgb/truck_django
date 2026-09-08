import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  headerTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  fieldRow: { flexDirection: 'row', marginBottom: 3 },
  fieldLabel: { width: 110, fontSize: 9, color: '#6b7280' },
  fieldValue: { flex: 1, fontSize: 9, borderBottomWidth: 0.5, borderBottomColor: '#d1d5db', paddingBottom: 1 },
  statsRow: { flexDirection: 'row', marginTop: 8, gap: 20 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 9, color: '#6b7280', marginRight: 4 },
  statValue: { fontSize: 10, fontWeight: 'bold' },
  gridSection: { marginTop: 10 },
  gridContainer: { flexDirection: 'row' },
  rowLabels: { width: 100 },
  rowLabel: { fontSize: 6.5, color: '#374151', height: 30, textAlign: 'right', paddingRight: 4, lineHeight: 1.2 },
  gridWrapper: { flex: 1 },
  totalsColumn: { width: 35, alignItems: 'center' },
  totalValue: { fontSize: 9, fontWeight: 'bold', height: 30, textAlign: 'center' },
  remarksSection: { marginTop: 10 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  remarksText: { fontSize: 8, color: '#374151', lineHeight: 1.4 },
  recapSection: { marginTop: 10 },
  recapHeaderRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#9ca3af' },
  recapValueRow: { flexDirection: 'row' },
  recapCell: { width: 100, padding: 4, borderWidth: 0.5, borderColor: '#9ca3af', alignItems: 'center' },
  recapHeader: { fontSize: 7, color: '#6b7280', textAlign: 'center' },
  recapValue: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  signatureSection: { marginTop: 15, flexDirection: 'row', alignItems: 'center' },
  signatureLine: { flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#9ca3af', marginRight: 10 },
  signatureLabel: { fontSize: 8, color: '#9ca3af' },
  dateLine: { width: 100, borderBottomWidth: 0.5, borderBottomColor: '#9ca3af', marginLeft: 10 },
  hourLabels: { flexDirection: 'row', height: 10 },
  hourLabel: { fontSize: 6, color: '#374151', textAlign: 'center' },
  gridBox: { borderWidth: 0.5, borderColor: '#9ca3af', height: 120 },
  gridRow: { flexDirection: 'row', height: 30, borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  gridCell: { borderRightWidth: 0.5, borderRightColor: '#d1d5db' },
  gridCellLast: {},
  dutySegment: { position: 'absolute', height: 2, backgroundColor: '#111827' },
  dutyVertical: { position: 'absolute', width: 2, backgroundColor: '#111827' },
});

const GRID_WIDTH = 460;
const ROW_HEIGHT = 30;
const COL_WIDTH = GRID_WIDTH / 24;

const STATUS_ROWS = [
  { key: 'off_duty', y: 0 },
  { key: 'sleeper_berth', y: ROW_HEIGHT },
  { key: 'driving', y: ROW_HEIGHT * 2 },
  { key: 'on_duty_not_driving', y: ROW_HEIGHT * 3 },
];

const STATUS_COLORS = {
  off_duty: '#22c55e',
  sleeper_berth: '#8b5cf6',
  driving: '#ef4444',
  on_duty_not_driving: '#f59e0b',
};

function parseTimeToHours(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
}

function GridSection({ events, log }) {
  const segments = [];
  if (events && events.length > 0) {
    let prevStatus = null;
    events.forEach((evt) => {
      if (evt.status === 'driving' && evt.duration_hours === 0) return;
      const startHour = parseTimeToHours(evt.start_time);
      const endHour = Math.min(startHour + evt.duration_hours, 24);
      if (startHour >= 24) return;
      const row = STATUS_ROWS.find((r) => r.key === evt.status);
      if (!row) return;
      const startX = (startHour / 24) * GRID_WIDTH;
      const width = ((endHour - startHour) / 24) * GRID_WIDTH;
      const y = row.y + 14;
      segments.push({ startX, width, y, status: evt.status, prevStatus, startHour });
      prevStatus = evt.status;
    });
  }

  return (
    <View style={styles.gridContainer}>
      <View style={styles.rowLabels}>
        {STATUS_ROWS.map((row) => (
          <Text key={row.key} style={styles.rowLabel}>
            {row.key === 'off_duty' ? '1. Off Duty' :
             row.key === 'sleeper_berth' ? '2. Sleeper Berth' :
             row.key === 'driving' ? '3. Driving' : '4. On Duty\n(Not Driving)'}
          </Text>
        ))}
      </View>
      <View style={styles.gridWrapper}>
        <View style={styles.hourLabels}>
          {Array.from({ length: 25 }, (_, h) => (
            <Text key={h} style={[styles.hourLabel, { width: h < 24 ? COL_WIDTH : 0, textAlign: 'center' }]}>
              {h < 24 ? h : ''}
            </Text>
          ))}
        </View>
        <View style={styles.gridBox}>
          {STATUS_ROWS.map((row, ri) => (
            <View key={row.key} style={styles.gridRow}>
              {Array.from({ length: 24 }, (_, ci) => (
                <View key={ci} style={[styles.gridCell, ci === 23 ? styles.gridCellLast : null, { width: COL_WIDTH }]} />
              ))}
            </View>
          ))}
          {segments.map((seg, i) => (
            <React.Fragment key={i}>
              <View style={{
                position: 'absolute',
                left: seg.startX,
                top: seg.y,
                width: seg.width,
                height: 2,
                backgroundColor: '#111827',
              }} />
              {i > 0 && seg.prevStatus && seg.prevStatus !== seg.status && (
                <View style={{
                  position: 'absolute',
                  left: seg.startX,
                  top: Math.min(
                    STATUS_ROWS.find(r => r.key === seg.status)?.y + 14 || 0,
                    STATUS_ROWS.find(r => r.key === seg.prevStatus)?.y + 14 || 0
                  ),
                  width: 2,
                  height: Math.abs(
                    (STATUS_ROWS.find(r => r.key === seg.status)?.y || 0) -
                    (STATUS_ROWS.find(r => r.key === seg.prevStatus)?.y || 0)
                  ),
                  backgroundColor: '#111827',
                }} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
      <View style={styles.totalsColumn}>
        {STATUS_ROWS.map((row) => (
          <Text key={row.key} style={[styles.totalValue, { color: STATUS_COLORS[row.key] }]}>
            {log ? (log[row.key]?.toFixed(1) || '0.0') : '0.0'}
          </Text>
        ))}
      </View>
    </View>
  );
}

function LogPage({ log, events, tripData, dayIndex }) {
  const today = new Date();
  const logDate = new Date(today);
  logDate.setDate(today.getDate() + dayIndex);
  const dateStr = logDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const totalDriving = tripData?.trip_summary?.total_driving_hours || 1;
  const milesToday = log.driving > 0
    ? Math.round((log.driving / totalDriving) * (tripData?.trip_summary?.total_miles || 0))
    : 0;

  const dayEvents = (events || []).filter((e) => e.day === log.day);
  const onDutyToday = log.driving + log.on_duty_not_driving;
  const recap = log.recap || {};

  const remarks = (events || [])
    .filter((e) => e.day === log.day && e.status !== 'driving')
    .map((e) => `${e.start_time || ''} - ${(e.remark || e.status).replace(/_/g, ' ')}`)
    .join('  |  ');

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Text style={styles.headerTitle}>Driver's Daily Log (FMCSA 49 CFR Part 395)</Text>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Date:</Text>
        <Text style={styles.fieldValue}>{dateStr}</Text>
        <Text style={[styles.fieldLabel, { marginLeft: 20 }]}>Carrier:</Text>
        <Text style={styles.fieldValue}>Spotter Logistics</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>From:</Text>
        <Text style={styles.fieldValue}>{tripData?.locations?.current?.name || tripData?.current_location || '\u2014'}</Text>
        <Text style={[styles.fieldLabel, { marginLeft: 20 }]}>Main Office:</Text>
        <Text style={styles.fieldValue}>123 Freight Way, Dallas, TX 75201</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>To:</Text>
        <Text style={styles.fieldValue}>{tripData?.locations?.dropoff?.name || tripData?.dropoff_location || '\u2014'}</Text>
        <Text style={[styles.fieldLabel, { marginLeft: 20 }]}>Truck/Tractor:</Text>
        <Text style={styles.fieldValue}>Truck #404</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Miles Driving Today:</Text>
          <Text style={styles.statValue}>{milesToday}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Vehicle Number:</Text>
          <Text style={styles.statValue}>Truck #404</Text>
        </View>
      </View>

      <View style={styles.gridSection}>
        <GridSection events={dayEvents} log={log} />
        <View style={{ flexDirection: 'row', marginTop: 2 }}>
          <View style={{ width: 100 }} />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
            {STATUS_ROWS.map((row) => (
              <Text key={row.key} style={{ fontSize: 8, fontWeight: 'bold', color: STATUS_COLORS[row.key], width: 35, textAlign: 'center' }}>
                {log[row.key]?.toFixed(1) || '0.0'}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.remarksSection}>
        <Text style={styles.sectionTitle}>Remarks / Notes:</Text>
        <Text style={styles.remarksText}>{remarks || '\u2014'}</Text>
      </View>

      <View style={styles.recapSection}>
        <Text style={styles.sectionTitle}>70-Hour / 8-Day Recap</Text>
        <View style={styles.recapHeaderRow}>
          {['On Duty Today', 'A: 7-Day On Duty', 'B: Available Tomorrow', 'C: 8-Day On Duty'].map((h) => (
            <View key={h} style={styles.recapCell}>
              <Text style={styles.recapHeader}>{h}</Text>
            </View>
          ))}
        </View>
        <View style={styles.recapValueRow}>
          {[onDutyToday, recap.field_a_7day_on_duty || 0, recap.field_b_available_tomorrow || 0, recap.field_c_8day_on_duty || 0].map((v, i) => (
            <View key={i} style={styles.recapCell}>
              <Text style={styles.recapValue}>{v.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.signatureSection}>
        <Text style={styles.signatureLabel}>Driver's Signature:</Text>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Date:</Text>
        <View style={styles.dateLine} />
      </View>
    </Page>
  );
}

export default function ELDLogPDF({ dailyLogs, timelineEvents, tripData }) {
  if (!dailyLogs || dailyLogs.length === 0) return null;
  return (
    <Document>
      {dailyLogs.map((log, i) => (
        <LogPage key={i} log={log} events={timelineEvents} tripData={tripData} dayIndex={i} />
      ))}
    </Document>
  );
}
