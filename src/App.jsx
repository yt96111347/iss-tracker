import { useMemo, useState } from 'react';
import { useIssPosition } from './hooks/useIssPosition.js';
import { useIssTrack } from './hooks/useIssTrack.js';
import { buildTrack, speedKmh } from './lib/orbit.js';
import { RETENTION_MS } from './lib/db.js';
import IssMap from './components/IssMap.jsx';
import StatsPanel from './components/StatsPanel.jsx';

const SPEED_WINDOW_MS = 60_000;

export default function App() {
  const [follow, setFollow] = useState(true);
  const { data: current, stats, isFetching, error } = useIssPosition();
  const { data: points, dataUpdatedAt } = useIssTrack(current);

  // 폴링 간격의 3배(최소 1분) 이상 비어 있으면 단절 구간으로 본다.
  const gapMs = Math.max(60_000, stats.interval * 3);

  // dataUpdatedAt이 바뀔 때마다(새 좌표 저장, 1분 주기 정리) '현재 기준 4시간' 창을 다시 계산
  const segments = useMemo(
    () => buildTrack(points, dataUpdatedAt || Date.now(), RETENTION_MS, gapMs),
    [points, gapMs, dataUpdatedAt],
  );

  // API timestamp가 초 단위라 짧은 간격은 오차가 크므로, 끊김 없는 최근 약 60초 구간으로 속도를 계산한다.
  const speed = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
    const last = sorted.at(-1);
    let i = sorted.length - 1;
    while (
      i > 0 &&
      sorted[i].timestamp - sorted[i - 1].timestamp <= gapMs &&
      last.timestamp - sorted[i - 1].timestamp <= SPEED_WINDOW_MS
    ) {
      i--;
    }
    return last && sorted[i] !== last ? speedKmh(sorted[i], last) : null;
  }, [points, gapMs]);

  return (
    <>
      <div className="topbar">
        <span className="brand">🛰️ ISS Tracker</span>
        <nav>
          <a href="#map">궤적 지도</a>
          <a href="#stats">속도 · 폴링</a>
        </nav>
      </div>

      <header className="hero">
        <span className="badge">실시간 · React 19 · TanStack Query · IndexedDB</span>
        <h1>국제 우주 정거장 실시간 추적 앱</h1>
        <p>
          Open Notify API로 ISS 위치를 수집하고 최근 4시간의 궤적을 지도에 표시합니다. 수집되지 않은 구간은 궤도
          모델로 계산해 점선으로 그립니다.
        </p>
      </header>

      <main>
        <section id="map">
          <div className="section-head">
            <span className="chip">LIVE</span>
            <h2>최근 4시간 궤적</h2>
          </div>
          <div className="card map-card">
            <IssMap segments={segments} current={current} follow={follow} />
            <div className="map-footer">
              <div className="legend">
                <span><i className="line actual" /> 실측 궤적</span>
                <span><i className="line inferred" /> 계산/추정 궤적</span>
              </div>
              <label className="follow">
                <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> ISS 따라가기
              </label>
            </div>
          </div>
        </section>

        <section id="stats">
          <div className="section-head">
            <span className="chip">STATUS</span>
            <h2>이동 속도 · API 폴링</h2>
          </div>
          <StatsPanel
            speed={speed}
            stats={stats}
            current={current}
            pointCount={points.length}
            inferredCount={segments.filter((s) => s.kind === 'inferred').length}
            isFetching={isFetching}
            error={error}
          />
        </section>
      </main>

      <footer>
        데이터: <a href="http://open-notify.org/" target="_blank" rel="noreferrer">Open Notify</a> · 지도:
        OpenStreetMap
      </footer>
    </>
  );
}
