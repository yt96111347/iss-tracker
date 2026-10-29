import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_URL = 'http://api.open-notify.org/iss-now.json';
export const MIN_INTERVAL = 5_000;
export const MAX_INTERVAL = 60_000;
const RTT_FACTOR = 10; // 응답시간 1ms당 폴링 간격 10ms 추가
const EMA_ALPHA = 0.3;

/**
 * 응답 속도(RTT)를 지수이동평균으로 측정해 폴링 간격을 능동적으로 조절한다.
 * interval = clamp(5초 + 평균 RTT × 10, 5초, 60초), 실패 시 간격을 2배로 늘린다.
 */
export function useIssPosition() {
  const stats = useRef({ rtt: null, avgRtt: null, interval: MIN_INTERVAL, failures: 0 });

  const query = useQuery({
    queryKey: ['iss-now'],
    queryFn: async ({ signal }) => {
      const s = stats.current;
      const started = performance.now();
      try {
        const res = await fetch(API_URL, { signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.message !== 'success') throw new Error('API 응답 오류');

        const rtt = performance.now() - started;
        s.rtt = rtt;
        s.avgRtt = s.avgRtt == null ? rtt : s.avgRtt * (1 - EMA_ALPHA) + rtt * EMA_ALPHA;
        s.failures = 0;
        s.interval = Math.round(Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, MIN_INTERVAL + s.avgRtt * RTT_FACTOR)));

        return {
          timestamp: json.timestamp * 1000,
          latitude: Number(json.iss_position.latitude),
          longitude: Number(json.iss_position.longitude),
        };
      } catch (err) {
        s.rtt = performance.now() - started;
        s.failures += 1;
        s.interval = Math.min(MAX_INTERVAL, s.interval * 2);
        throw err;
      }
    },
    refetchInterval: () => stats.current.interval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 0,
  });

  return { ...query, stats: { ...stats.current } };
}
