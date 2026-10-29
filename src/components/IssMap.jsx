import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { splitAntimeridian } from '../lib/orbit.js';
import { issIcon } from './issIcon.js';

const ACTUAL_STYLE = { color: '#4f46e5', weight: 3, opacity: 0.9 };
const INFERRED_STYLE = { color: '#06b6d4', weight: 2.5, opacity: 0.9, dashArray: '6 8' };

function FollowIss({ position, follow }) {
  const map = useMap();
  const [lat, lon] = position ?? [];
  useEffect(() => {
    if (follow && lat != null) map.panTo([lat, lon], { animate: true });
  }, [map, lat, lon, follow]);
  return null;
}

export default function IssMap({ segments, current, follow }) {
  const lines = useMemo(
    () =>
      segments.flatMap((seg, i) =>
        splitAntimeridian(seg.points).map((positions, j) => ({ key: `${i}-${j}`, kind: seg.kind, positions })),
      ),
    [segments],
  );
  const position = current ? [current.latitude, current.longitude] : null;

  return (
    <MapContainer center={[0, 0]} zoom={2} minZoom={2} worldCopyJump className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {lines.map((l) => (
        <Polyline
          key={l.key}
          positions={l.positions}
          pathOptions={l.kind === 'actual' ? ACTUAL_STYLE : INFERRED_STYLE}
        />
      ))}
      {position && (
        <Marker position={position} icon={issIcon}>
          <Popup>
            <b>국제 우주 정거장 (ISS)</b>
            <br />
            위도 {current.latitude.toFixed(4)}°, 경도 {current.longitude.toFixed(4)}°
          </Popup>
        </Marker>
      )}
      <FollowIss position={position} follow={follow} />
    </MapContainer>
  );
}
