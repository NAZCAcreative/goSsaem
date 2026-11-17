import { useCallback, useEffect, useState } from "react";
export function useRemote<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.resolve()
      .then(load)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active)
          setError("불러오지 못했습니다. 네트워크와 서버 연결을 확인해주세요.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, revision]);
  return { data, error, loading, reload };
}
