// 단순 원궤도 모델로 ISS 위치를 추정한다.
// 경사각 51.64°, 공전주기 약 92.9분, 지구 자전과 궤도면 세차(약 -5°/일)를 반영한다.
const DEG = Math.PI / 180;
const INCLINATION = 51.64 * DEG;
const PERIOD_S = 92.9 * 60;
const MEAN_MOTION = (2 * Math.PI) / PERIOD_S; // rad/s
const EARTH_ROT = (2 * Math.PI) / 86164.0905; // rad/s (항성일)
const PRECESSION = (-5.0 * DEG) / 86400; // rad/s
const NODE_DRIFT = EARTH_ROT - PRECESSION; // 지구 고정 좌표계에서 승교점의 서쪽 이동 속도

export const EARTH_RADIUS_KM = 6371;
export const ISS_ALTITUDE_KM = 420;

const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;

/** 기준점(lat, lon, 상승/하강 여부)에서 궤도 상태(위도 인수 u0, 승교점 경도 node0)를 구한다. */
function orbitState({ latitude, longitude }, ascending) {
  const s = Math.max(-1, Math.min(1, Math.sin(latitude * DEG) / Math.sin(INCLINATION)));
  let u0 = Math.asin(s);
  if (!ascending) u0 = Math.PI - u0;
  const node0 = longitude * DEG - Math.atan2(Math.cos(INCLINATION) * Math.sin(u0), Math.cos(u0));
  return { u0, node0 };
}

/** 기준점에서 dt초 뒤(음수면 이전)의 위치를 계산한다. 경도는 래핑하지 않은 연속값으로 반환한다. */
function propagate(state, dtSec) {
  const u = state.u0 + MEAN_MOTION * dtSec;
  const lat = Math.asin(Math.sin(INCLINATION) * Math.sin(u)) / DEG;
  const lon =
    (state.node0 + Math.atan2(Math.cos(INCLINATION) * Math.sin(u), Math.cos(u)) - NODE_DRIFT * dtSec) / DEG;
  return { lat, lon };
}

/** 이웃 좌표와 비교해 상승(북쪽으로 이동) 중인지 판단한다. */
function isAscending(points, i) {
  const a = points[i];
  const b = points[i + 1] ?? points[i - 1];
  if (!b) return true;
  const dLat = b.latitude - a.latitude;
  return b.timestamp > a.timestamp ? dLat >= 0 : dLat <= 0;
}

/** 기준점에서 [fromMs, toMs] 구간의 추정 궤적을 생성한다. */
function inferFrom(ref, ascending, fromMs, toMs, stepMs) {
  const state = orbitState(ref, ascending);
  const out = [];
  for (let t = fromMs; t < toMs; t += stepMs) out.push({ t, ...propagate(state, (t - ref.timestamp) / 1000) });
  out.push({ t: toMs, ...propagate(state, (toMs - ref.timestamp) / 1000) });
  return out.map((p) => ({ ...p, lon: wrapLon(p.lon) }));
}

/** 두 실측점 사이의 단절 구간을 양쪽 끝점에서 추정한 궤적을 시간 가중 평균하여 메운다. */
function inferGap(a, ascA, b, ascB, stepMs) {
  const sa = orbitState(a, ascA);
  const sb = orbitState(b, ascB);
  const span = b.timestamp - a.timestamp;
  const out = [];
  for (let t = a.timestamp; t <= b.timestamp; t += stepMs) {
    const w = (t - a.timestamp) / span;
    const pa = propagate(sa, (t - a.timestamp) / 1000);
    const pb = propagate(sb, (t - b.timestamp) / 1000);
    // 경도를 pa 기준으로 언랩한 뒤 보간
    let lonB = pb.lon;
    while (lonB - pa.lon > 180) lonB -= 360;
    while (lonB - pa.lon < -180) lonB += 360;
    out.push({ t, lat: pa.lat * (1 - w) + pb.lat * w, lon: wrapLon(pa.lon * (1 - w) + lonB * w) });
  }
  out.push({ t: b.timestamp, lat: b.latitude, lon: b.longitude });
  return out;
}

const toPt = (p) => ({ t: p.timestamp, lat: p.latitude, lon: p.longitude });

/**
 * 저장된 실측 좌표로 최근 windowMs 동안의 궤적 세그먼트를 만든다.
 * - actual: 실측 구간 (실선)
 * - inferred: 단절 구간 또는 수집 이전 구간의 추정 궤적 (점선)
 */
export function buildTrack(points, now, windowMs, gapMs) {
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  if (!sorted.length) return [];
  const start = now - windowMs;
  const step = 30_000;
  const segments = [];

  // 1) 가장 오래된 실측점 이전 ~ 4시간 전까지 추정
  if (sorted[0].timestamp - start > gapMs) {
    segments.push({ kind: 'inferred', points: inferFrom(sorted[0], isAscending(sorted, 0), start, sorted[0].timestamp, step) });
  }

  // 2) 실측 구간과 단절 구간
  let current = [toPt(sorted[0])];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.timestamp - prev.timestamp > gapMs) {
      segments.push({ kind: 'actual', points: current });
      segments.push({
        kind: 'inferred',
        points: inferGap(prev, isAscending(sorted, i - 1), cur, isAscending(sorted, i), step),
      });
      current = [toPt(cur)];
    } else {
      current.push(toPt(cur));
    }
  }
  segments.push({ kind: 'actual', points: current });
  return segments;
}

/** 날짜변경선(±180°)을 넘는 지점에서 선을 끊어 지도에 가로선이 생기지 않게 한다. */
export function splitAntimeridian(points) {
  const lines = [];
  let line = [];
  for (const p of points) {
    const last = line[line.length - 1];
    if (last && Math.abs(p.lon - last[1]) > 180) {
      lines.push(line);
      line = [];
    }
    line.push([p.lat, p.lon]);
  }
  if (line.length) lines.push(line);
  return lines.filter((l) => l.length > 1);
}

/** 두 좌표 사이의 궤도 고도 기준 이동 속도(km/h) */
export function speedKmh(a, b) {
  const dt = (b.timestamp - a.timestamp) / 3_600_000;
  if (dt <= 0) return null;
  const φ1 = a.latitude * DEG;
  const φ2 = b.latitude * DEG;
  const dφ = φ2 - φ1;
  const dλ = (b.longitude - a.longitude) * DEG;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  const dist = 2 * (EARTH_RADIUS_KM + ISS_ALTITUDE_KM) * Math.asin(Math.sqrt(h));
  return dist / dt;
}
