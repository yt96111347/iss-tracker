const fmt = (n, digits = 0) => (n == null ? '—' : n.toLocaleString('ko-KR', { maximumFractionDigits: digits }));

const rttClass = (rtt) => (rtt == null ? 's3' : rtt < 500 ? 's2' : rtt < 1500 ? 's4' : 's5');

export default function StatsPanel({ speed, stats, current, pointCount, inferredCount, isFetching, error }) {
  return (
    <>
      <div className="card">
        <h3>🚀 이동 속도</h3>
        <div className="speed">
          <span className="speed-value">{fmt(speed)}</span>
          <span className="speed-unit">km/h</span>
        </div>
        <p className="muted">
          {speed == null
            ? '연속된 두 좌표가 수집되면 속도를 계산합니다.'
            : `≈ ${fmt(speed / 3600, 2)} km/s · 고도 약 420km 궤도 기준, 최근 약 60초 실측 좌표 간 거리 ÷ 시간`}
        </p>
      </div>

      <div className="card">
        <h3>📡 API 폴링 상태</h3>
        <div className="status-grid">
          <div className="status s3">
            <b>{fmt(stats.interval / 1000, 1)} 초</b>Polling 간격
          </div>
          <div className={`status ${rttClass(stats.rtt)}`}>
            <b>{fmt(stats.rtt)} ms</b>최근 API 응답 속도
          </div>
          <div className={`status ${rttClass(stats.avgRtt)}`}>
            <b>{fmt(stats.avgRtt)} ms</b>평균 응답 속도 (EMA)
          </div>
          <div className={`status ${error ? 's5' : 's2'}`}>
            <b>{error ? '오류' : isFetching ? '요청 중…' : '정상'}</b>
            {error ? `${error.message} (연속 ${stats.failures}회)` : 'API 연결 상태'}
          </div>
        </div>
        <p className="muted">
          간격 = 5초 + 평균 응답시간 × 10 (최소 5초, 최대 60초) · 요청 실패 시 간격을 2배로 늘려 백오프
        </p>
      </div>

      <div className="card">
        <h3>🛰️ 현재 위치 · 저장 현황</h3>
        <table>
          <tbody>
            <tr><th>위도</th><td>{current ? `${current.latitude.toFixed(4)}°` : '—'}</td></tr>
            <tr><th>경도</th><td>{current ? `${current.longitude.toFixed(4)}°` : '—'}</td></tr>
            <tr><th>측정 시각</th><td>{current ? new Date(current.timestamp).toLocaleString('ko-KR') : '—'}</td></tr>
            <tr><th>IndexedDB 저장 좌표</th><td>{fmt(pointCount)}개 (최근 4시간)</td></tr>
            <tr><th>추정 궤적 구간</th><td>{fmt(inferredCount)}개</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
