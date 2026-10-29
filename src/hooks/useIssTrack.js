import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loadRecent, pruneOld, savePosition } from '../lib/db.js';

const TRACK_KEY = ['iss-track'];

/** 새 좌표를 IndexedDB에 저장하고, 4시간 이전 좌표를 삭제한 뒤 최근 좌표 목록을 반환한다. */
export function useIssTrack(latest) {
  const queryClient = useQueryClient();

  const track = useQuery({
    queryKey: TRACK_KEY,
    queryFn: async () => {
      await pruneOld();
      return loadRecent();
    },
    refetchInterval: 60_000, // 새 좌표가 없어도 1분마다 오래된 좌표 정리
    refetchIntervalInBackground: true,
    initialData: [],
    initialDataUpdatedAt: 0,
  });

  const { mutate } = useMutation({
    mutationFn: savePosition,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRACK_KEY }),
  });

  useEffect(() => {
    if (latest) mutate(latest);
  }, [latest, mutate]);

  return track;
}
