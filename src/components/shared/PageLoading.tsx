export function PageLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center bg-background px-container-margin ${compact ? 'min-h-48 py-12' : 'min-h-[calc(100dvh-4rem)] pb-24'}`}>
      <div className="flex items-center gap-3 text-sm text-on-surface-variant">
        <span aria-hidden="true" className="h-5 w-5 rounded-full border-2 border-outline-variant border-t-primary motion-safe:animate-spin" />
        <span>화면을 불러오는 중입니다.</span>
      </div>
    </div>
  );
}
