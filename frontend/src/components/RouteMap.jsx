import { useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

function divIcon(color, symbol) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:28px;height:28px;border-radius:50%;
      border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:14px;font-weight:700;
    ">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function fuelIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#3b82f6;
      width:28px;height:28px;border-radius:50%;
      border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
    "><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 4"/><rect x="5" y="7" width="6" height="5" rx="1"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const ICONS = {
  start:   divIcon('#22c55e', 'S'),
  pickup:  divIcon('#f59e0b', 'P'),
  dropoff: divIcon('#ef4444', 'D'),
  fuel:    fuelIcon(),
  rest:    divIcon('#8b5cf6', 'R'),
};

function FlyToBounds({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    try {
      const layer = L.geoJSON(geojson);
      map.flyToBounds(layer.getBounds(), {
        padding: [50, 50],
        duration: 1.5,
      });
    } catch (_) { /* geometry may be malformed */ }
  }, [geojson, map]);
  return null;
}

export default function RouteMap({ tripData }) {
  const mapRef = useRef(null);
  const center = useMemo(() => [39.8283, -98.5795], []);

  if (!tripData || !tripData.route_geometry) {
    return (
      <div className="border border-white/5 bg-[#090d16]/50 h-[480px] flex items-center justify-center no-print relative z-0">
        <div className="text-center px-4">
          <svg className="mx-auto h-14 w-14 mb-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="font-bold uppercase tracking-wider text-slate-400 text-sm">Plan a trip to see the route</p>
          <p className="text-xs text-slate-600 mt-1">Enter locations and click Plan Trip</p>
        </div>
      </div>
    );
  }

  const markers = buildMarkers(tripData);

  return (
    <div className="border border-white/5 bg-[#090d16]/50 overflow-hidden no-print relative z-0">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white">Route Map</h3>
        {tripData.trip_summary && (
          <span className="text-xs text-slate-400 tabular-nums">
            {tripData.trip_summary.total_miles} mi &mdash; {tripData.trip_summary.total_driving_hours}h drive
          </span>
        )}
      </div>

      <div className="h-[480px] relative z-0">
        <MapContainer
          ref={mapRef}
          center={center}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToBounds geojson={tripData.route_geometry} />

          <GeoJSON
            key={JSON.stringify(tripData.route_geometry)}
            data={tripData.route_geometry}
            style={{ color: '#38bdf8', weight: 5, opacity: 0.85 }}
          />

          {markers.map((m, i) => (
            <Marker key={i} position={m.position} icon={m.icon}>
              <Popup>
                <strong>{m.label}</strong><br />
                {m.time && <span>{m.time}</span>}
                {m.remark && <><br /><em>{m.remark}</em></>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function buildMarkers(tripData) {
  const markers = [];
  const locs = tripData.locations;

  if (locs?.current?.coords) {
    markers.push({
      position: [locs.current.coords.lat, locs.current.coords.lon],
      icon: ICONS.start,
      label: locs.current.name || 'Start',
      time: 'Start',
    });
  }

  if (locs?.pickup?.coords) {
    markers.push({
      position: [locs.pickup.coords.lat, locs.pickup.coords.lon],
      icon: ICONS.pickup,
      label: locs.pickup.name || 'Pickup',
      time: 'Pickup',
    });
  }

  if (locs?.dropoff?.coords) {
    markers.push({
      position: [locs.dropoff.coords.lat, locs.dropoff.coords.lon],
      icon: ICONS.dropoff,
      label: locs.dropoff.name || 'Dropoff',
      time: 'Dropoff',
    });
  }

  if (tripData.timeline_events) {
    const geo = tripData.route_geometry?.coordinates || [];
    const totalPts = geo.length;
    let elapsed = 0;
    const totalHours = tripData.trip_summary?.total_trip_hours || 1;

    tripData.timeline_events.forEach((evt) => {
      elapsed += evt.duration_hours;
      const frac = Math.min(elapsed / totalHours, 1);
      const idx = Math.min(Math.floor(frac * (totalPts - 1)), totalPts - 1);
      const coord = geo[idx];
      if (!coord) return;

      const pos = [coord[1], coord[0]];

      if (evt.remark === 'Fuel stop') {
        markers.push({ position: pos, icon: ICONS.fuel, label: 'Fuel Stop', time: evt.start_time, remark: evt.remark });
      } else if (evt.remark && evt.remark.includes('rest period')) {
        markers.push({ position: pos, icon: ICONS.rest, label: 'Rest Break', time: evt.start_time, remark: evt.remark });
      }
    });
  }

  return markers;
}
