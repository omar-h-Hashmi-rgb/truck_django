import { useState } from 'react';
import {
  Clock, Navigation, Fuel, Coffee, MapPin, Truck,
  ChevronDown, ChevronUp,
} from 'lucide-react';

const HOS_STYLES = {
  pickup:     { icon: Truck,    dot: 'bg-blue-500',   row: 'bg-blue-500/10 border-blue-500/20' },
  dropoff:    { icon: MapPin,   dot: 'bg-green-500',  row: 'bg-green-500/10 border-green-500/20' },
  fuel:       { icon: Fuel,     dot: 'bg-orange-500', row: 'bg-orange-500/10 border-orange-500/20' },
  break30:    { icon: Coffee,   dot: 'bg-yellow-500', row: 'bg-yellow-500/10 border-yellow-500/20' },
  rest10:     { icon: Coffee,   dot: 'bg-purple-500', row: 'bg-purple-500/10 border-purple-500/20' },
  rest34:     { icon: Coffee,   dot: 'bg-purple-700', row: 'bg-purple-500/10 border-purple-500/20' },
  pretrip:    { icon: Truck,    dot: 'bg-slate-500',  row: 'bg-white/5 border-white/10' },
  default_hos:{ icon: Clock,    dot: 'bg-slate-400',  row: 'bg-white/5 border-white/10' },
};

function classifyHosEvent(evt) {
  const r = evt.remark || '';
  if (r === 'Loading at pickup')         return HOS_STYLES.pickup;
  if (r === 'Unloading at dropoff')      return HOS_STYLES.dropoff;
  if (r === 'Fuel stop')                 return HOS_STYLES.fuel;
  if (r.includes('30-minute'))           return HOS_STYLES.break30;
  if (r.includes('34-hour'))             return HOS_STYLES.rest34;
  if (r.includes('10-hour'))             return HOS_STYLES.rest10;
  if (r.includes('Pre-trip'))            return HOS_STYLES.pretrip;
  return HOS_STYLES.default_hos;
}

function buildMergedTimeline(osrmSteps, hosEvents) {
  const items = [];
  const regulatoryHos = (hosEvents || []).filter((e) => e.status !== 'driving');

  let stepIdx = 0;
  const leg0Count = Math.floor((osrmSteps || []).length / 2);

  const pretrip = regulatoryHos.find((e) => e.remark?.includes('Pre-trip'));
  if (pretrip) items.push({ type: 'hos', data: pretrip });

  const leg0Steps = (osrmSteps || []).slice(0, leg0Count);
  leg0Steps.forEach((step) => items.push({ type: 'direction', data: step }));

  const pickupEvt = regulatoryHos.find((e) => e.remark?.includes('Loading at pickup'));
  if (pickupEvt) items.push({ type: 'hos', data: pickupEvt });

  const leg1Steps = (osrmSteps || []).slice(leg0Count);
  leg1Steps.forEach((step) => items.push({ type: 'direction', data: step }));

  const nonTransitionHos = regulatoryHos.filter(
    (e) => !e.remark?.includes('Pre-trip') &&
           !e.remark?.includes('Loading at pickup') &&
           !e.remark?.includes('Unloading at dropoff')
  );
  nonTransitionHos.forEach((e) => items.push({ type: 'hos', data: e }));

  const dropoffEvt = regulatoryHos.find((e) => e.remark?.includes('Unloading at dropoff'));
  if (dropoffEvt) items.push({ type: 'hos', data: dropoffEvt });

  return items;
}

export default function TripTimeline({ tripData }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  if (!tripData?.timeline_events?.length) return null;

  const osrmSteps = tripData.osrm_steps || [];
  const hosEvents = tripData.timeline_events || [];
  const summary = tripData.trip_summary;

  const merged = buildMergedTimeline(osrmSteps, hosEvents);
  const visibleItems = showAll ? merged : merged.slice(0, 30);

  return (
    <div className="border border-white/5 bg-[#090d16]/50 p-6 no-print">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-400" aria-hidden="true" />
          Route Instructions
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-none hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-[0.97]"
          aria-label={expanded ? 'Collapse timeline' : 'Expand timeline'}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {expanded && (
        <>
          {summary && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label="Miles" value={summary.total_miles} unit="mi" />
              <Stat label="Drive" value={summary.total_driving_hours} unit="h" />
              <Stat label="Days" value={summary.estimated_days} unit="d" />
            </div>
          )}

          <div className="relative max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="absolute left-[11px] top-0 bottom-0 w-px bg-white/10" />

            <div className="space-y-0.5">
              {visibleItems.map((item, i) =>
                item.type === 'hos' ? (
                  <HosRow key={'hos-' + i} evt={item.data} />
                ) : (
                  <DirectionRow key={'dir-' + i} step={item.data} />
                )
              )}
            </div>

            {merged.length > 30 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-3 w-full text-center text-xs text-sky-400 hover:underline py-2 uppercase tracking-widest cursor-pointer"
              >
                Show all {merged.length} instructions
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DirectionRow({ step }) {
  return (
    <div className="relative flex items-start gap-3 py-1.5 px-1 rounded-none hover:bg-white/5 transition-colors">
      <div className="absolute left-0 top-2 w-[23px] h-[23px] rounded-full bg-white/10 flex items-center justify-center z-10 shrink-0">
        <Navigation className="h-2.5 w-2.5 text-slate-400" />
      </div>
      <div className="ml-7 min-w-0 flex-1">
        <p className="text-xs text-slate-300 leading-snug">{step.instruction}</p>
        {(step.distance_miles > 0 || step.duration_hours > 0) && (
          <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
            {step.distance_miles > 0 && <span>{step.distance_miles} mi</span>}
            {step.distance_miles > 0 && step.duration_hours > 0 && <span> &mdash; </span>}
            {step.duration_hours > 0 && <span>{formatDuration(step.duration_hours)}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function HosRow({ evt }) {
  const style = classifyHosEvent(evt);
  const Icon = style.icon;

  return (
    <div className={`relative flex items-start gap-3 py-2 px-2 rounded-none border ${style.row}`}>
      <div className={`absolute left-0 top-2 w-[23px] h-[23px] rounded-full ${style.dot} flex items-center justify-center z-10 shrink-0`}>
        <Icon className="h-2.5 w-2.5 text-white" />
      </div>
      <div className="ml-7 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-slate-500">
            Day {evt.day} {evt.start_time}
          </span>
          <span className="text-[10px] font-medium text-slate-400 bg-white/5 px-1 rounded-none">
            {evt.duration_hours}h
          </span>
        </div>
        <p className="text-xs font-semibold text-white mt-0.5">
          {evt.remark || evt.status.replace(/_/g, ' ')}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="bg-white/5 border border-white/5 py-2 px-3 text-center rounded-none">
      <span className="text-lg font-bold text-sky-400 tabular-nums">{value}</span>
      <span className="text-xs text-slate-500 ml-0.5">{unit}</span>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function formatDuration(hours) {
  if (hours < 1) return Math.round(hours * 60) + 'min';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
