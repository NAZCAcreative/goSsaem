import { ProfileClip } from './ProfileClip';
import { portfolioLabels, styleAxes, type PortfolioEntry } from '@/lib/queries/teacherPortfolio';

export function PortfolioSections({ entries }: { entries: PortfolioEntry[] }) {
  return <div className="space-y-8">{(Object.keys(portfolioLabels) as PortfolioEntry['kind'][]).map(kind => {
    const items = entries.filter(entry => entry.kind === kind);
    if (!items.length) return null;
    return <section key={kind}>
      <div className="mb-4 flex flex-wrap items-center gap-2"><h2 className="font-headline-md">{portfolioLabels[kind]}</h2><span className="rounded-full bg-surface-container px-2 py-1 text-xs text-on-surface-variant">본인 작성</span></div>
      <div className="grid gap-4 md:grid-cols-2">{items.map(entry => <article key={entry.id} className="min-w-0 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
        {styleAxes[kind] && entry.style_level ? <div><p className="text-sm">{styleAxes[kind]![0]} ↔ {styleAxes[kind]![1]}</p><meter className="w-full" min={1} max={5} value={entry.style_level} aria-label={portfolioLabels[kind]} /> <span>{entry.style_level}/5</span></div> : <h3 className="break-words font-semibold">{entry.title}</h3>}
        {(kind==='demo'||kind==='intro') && <ProfileClip title={entry.title} path={entry.media_path} url={entry.url}/> }
        {(entry.organization || entry.period) && <p className="mt-1 text-sm text-on-surface-variant">{[entry.organization, entry.period].filter(Boolean).join(' · ')}</p>}
        {entry.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-on-surface-variant">{entry.description}</p>}
        {entry.url && /^https?:\/\//i.test(entry.url) && <a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary" href={entry.url} target="_blank" rel="noopener noreferrer">관련 링크 보기 <span className="material-symbols-outlined ml-1 text-base" aria-hidden="true">open_in_new</span></a>}
      </article>)}</div>
    </section>;
  })}</div>;
}
