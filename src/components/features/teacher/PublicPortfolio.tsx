'use client';
import { useEffect, useState } from 'react';
import { listPortfolio, type PortfolioEntry } from '@/lib/queries/teacherPortfolio';
import { PortfolioSections } from './PortfolioSections';

export function PublicPortfolio({ teacherId }: { teacherId: string }) {
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setEntries([]); setStatus('loading');
    listPortfolio(teacherId, true).then(rows => { if (!cancelled) { setEntries(rows); setStatus('ready'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [teacherId, retry]);
  if (status === 'loading') return <p role="status" className="text-sm text-on-surface-variant">경력과 대표 작업을 불러오는 중...</p>;
  if (status === 'error') return <p role="alert" className="text-sm">경력과 대표 작업을 불러오지 못했습니다. <button className="min-h-11 text-primary" onClick={() => setRetry(value => value + 1)}>다시 시도</button></p>;
  return <PortfolioSections entries={entries} />;
}
