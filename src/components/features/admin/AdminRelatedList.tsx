'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ADMIN_COLUMNS,
  ADMIN_SECTIONS,
  adminDisplay,
  type AdminList,
  type AdminRow,
} from '@/lib/admin';
import { AdminModal } from './AdminDialogs';

export type ListSection = keyof typeof ADMIN_COLUMNS;
export type RelatedView =
  | {
      kind: 'list';
      section: ListSection;
      member?: string;
      name?: string;
      status?: string;
      page: number;
      query: string;
    }
  | { kind: 'record'; section: ListSection; row: AdminRow };

export function AdminRelatedList({
  view,
  onChange,
  onOpen,
  onClose,
}: {
  view: Extract<RelatedView, { kind: 'list' }>;
  onChange: (view: RelatedView) => void;
  onOpen: (row: AdminRow) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<AdminList | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState(view.query);
  useEffect(() => {
    let active = true;
    setList(null);
    setError(false);
    async function load() {
      try {
        const result = await createClient().rpc('admin_list', {
          p_section:
            view.section === 'teacher_pending' ? 'teachers' : view.section,
          p_page: view.page,
          p_page_size: 10,
          p_member_id: view.member || null,
          p_query: view.query,
          p_status: view.status || '',
        });
        if (result.error) throw result.error;
        if (active) setList(result.data as AdminList);
      } catch {
        if (active) setError(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [view, retry]);
  const label = ADMIN_SECTIONS.find((item) => item.id === view.section)?.label;
  const button =
    'min-h-11 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40';
  return (
    <AdminModal
      title={[view.name, label].filter(Boolean).join(' · ')}
      onClose={onClose}
    >
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onChange({ ...view, page: 1, query: search.trim() });
        }}
      >
        <input
          aria-label="관련 내역 검색"
          placeholder="관련 내역 검색"
          maxLength={100}
          className="min-w-0 flex-1 rounded-lg border px-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={button}>검색</button>
      </form>
      {error ? (
        <p role="alert">
          내역을 불러오지 못했습니다.{' '}
          <button className={button} onClick={() => setRetry((n) => n + 1)}>
            다시 시도
          </button>
        </p>
      ) : !list ? (
        <p role="status">조회 중…</p>
      ) : (
        <>
          <p role="status">총 {list.total}건</p>
          {list.rows.map((row) => (
            <button
              key={row.id}
              onClick={() => onOpen(row)}
              className="block w-full rounded-lg border p-3 text-left hover:bg-slate-50"
            >
              <strong className="break-words">
                {String(
                  row.title ||
                    row.name ||
                    row.teacher_name ||
                    row.student_name ||
                    row.code ||
                    row.actor_name ||
                    row.id,
                )}
              </strong>
              <span className="mt-1 block break-words text-sm text-slate-600">
                {ADMIN_COLUMNS[view.section]
                  .slice(1)
                  .map(
                    ([key, title]) =>
                      title + ' ' + adminDisplay(key, row[key], row),
                  )
                  .join(' · ')}
              </span>
            </button>
          ))}
          <nav
            aria-label="관련 내역 페이지"
            className="flex items-center justify-between"
          >
            <button
              className={button}
              disabled={list.page <= 1}
              onClick={() => onChange({ ...view, page: list.page - 1 })}
            >
              이전
            </button>
            <span>
              {list.page} / {Math.max(1, Math.ceil(list.total / list.pageSize))}
            </span>
            <button
              className={button}
              disabled={list.page * list.pageSize >= list.total}
              onClick={() => onChange({ ...view, page: list.page + 1 })}
            >
              다음
            </button>
          </nav>
        </>
      )}
    </AdminModal>
  );
}
