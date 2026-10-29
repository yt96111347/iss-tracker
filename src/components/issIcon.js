import L from 'leaflet';

// 우주 정거장 모양 SVG: 중앙 트러스, 여압 모듈, 좌우 태양전지판 4쌍
const panels = [6, 15, 41, 50]
  .map(
    (x) => `
    <rect x="${x}" y="8" width="8" height="20" fill="url(#panel)"/>
    <rect x="${x}" y="36" width="8" height="20" fill="url(#panel)"/>
    <line x1="${x + 4}" y1="28" x2="${x + 4}" y2="36"/>
    <line x1="${x}" y1="18" x2="${x + 8}" y2="18" stroke="#e0e7ff" stroke-width="0.5"/>
    <line x1="${x}" y1="46" x2="${x + 8}" y2="46" stroke="#e0e7ff" stroke-width="0.5"/>`,
  )
  .join('');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56">
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <g stroke="#1e293b" stroke-width="0.8">
    <rect x="4" y="30.5" width="56" height="3" rx="1" fill="#cbd5e1"/>
    ${panels}
    <rect x="28" y="18" width="8" height="28" rx="3" fill="#f8fafc"/>
    <rect x="25" y="26" width="14" height="12" rx="2" fill="#e2e8f0"/>
    <rect x="29.5" y="12" width="5" height="6" rx="1" fill="#f1f5f9"/>
    <rect x="29.5" y="46" width="5" height="6" rx="1" fill="#f1f5f9"/>
    <rect x="25" y="22" width="3" height="5" fill="#fef3c7"/>
    <rect x="36" y="37" width="3" height="5" fill="#fef3c7"/>
  </g>
</svg>`;

export const issIcon = L.divIcon({
  html: svg,
  className: 'iss-marker',
  iconSize: [56, 56],
  iconAnchor: [28, 28],
});
