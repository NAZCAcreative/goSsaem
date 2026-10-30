'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { PageLoading } from './PageLoading';

/** Wait for initial data; keep filters and inputs mounted during subsequent requests. */
export function PageContent({ loading, compact = false, children }: { loading: boolean; compact?: boolean; children: ReactNode }) {
  const [hasLoaded, setHasLoaded] = useState(!loading);

  useEffect(() => {
    if (!loading) setHasLoaded(true);
  }, [loading]);

  if (loading && !hasLoaded) return <PageLoading compact={compact} />;
  return <>{children}</>;
}
