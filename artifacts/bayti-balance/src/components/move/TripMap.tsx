import { useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { divIcon, type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ActivityStop, TripStop } from '@/lib/move-types';
import { stopIcon } from './stopIcons';

function pin(stop: ActivityStop, state: 'on' | 'dim' | '') {
  const I = stopIcon(stop.illustration, (stop as TripStop).kind);
  return divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
    html: renderToStaticMarkup(<div className={`mv-pin ${state}`}><I size={15} color="#17264D" strokeWidth={2.4} /></div>) });
}

export default function TripMap({ stops, route, onTileError }: { stops: ActivityStop[]; route: TripStop[]; onTileError: () => void }) {
  const [failed, setFailed] = useState(false);
  const inRoute = useMemo(() => new Set(route.map((s) => s.id)), [route]);
  const markers = useMemo(() => {
    const byId = new Map(stops.map((stop) => [stop.id, stop]));
    // Indoor replacements retain their itinerary IDs, but change name/location.
    route.forEach((stop) => byId.set(stop.id, stop));
    return [...byId.values()];
  }, [stops, route]);
  const line = route.filter((s) => !s.optional).map((s) => [s.lat, s.lng] as LatLngExpression);
  return <MapContainer center={[24.47, 54.38]} zoom={11} scrollWheelZoom={false} style={{ height: '100%' }}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      eventHandlers={{ tileerror: () => { if (!failed) { setFailed(true); onTileError(); } } }} />
    {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#317b71', weight: 4, dashArray: '6 8' }} />}
    {markers.map((s) => <Marker key={s.id} position={[s.lat, s.lng]} icon={pin(s, inRoute.has(s.id) ? 'on' : route.length ? 'dim' : '')}>
      <Popup><strong>{s.name}</strong><br />{s.minutes} min · AED {s.cost} (estimate)<br />{s.indoor ? 'Indoor' : 'Outdoor'}</Popup>
    </Marker>)}
  </MapContainer>;
}
