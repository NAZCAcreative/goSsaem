'use client';

import { showError, showConfirm } from '@/components/shared/AlertDialog';

import { PageContent } from '@/components/shared/PageContent';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { showToast } from '@/components/shared/Toast';
import { deleteMaterial, getMaterialDownloadUrl, listMaterials, uploadMaterial, type MaterialRow } from '@/lib/queries/materials';
import { useAuthStore } from '@/stores/auth-store';

const FOLDERS = ['전체 파일', '문법 교재', '회화 연습', 'TOPIK 기출', '미디어 파일'];

function fileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return { icon: 'picture_as_pdf', className: 'bg-error-container/20 text-error' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'description', className: 'bg-primary-container/10 text-primary' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { icon: 'image', className: 'bg-secondary-container/10 text-secondary' };
  if (['mp4', 'mov', 'webm'].includes(ext)) return { icon: 'movie', className: 'bg-tertiary-container/10 text-tertiary' };
  return { icon: 'insert_drive_file', className: 'bg-surface-container-high text-on-surface-variant' };
}

export default function TeacherMaterialsPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [files, setFiles] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeFolder, setActiveFolder] = useState(FOLDERS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    listMaterials(user.id)
      .then((data) => {
        if (!cancelled) setFiles(data);
      })
      .catch(() => {
        if (!cancelled) showError('자료 목록을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated]);

  const visibleFiles = activeFolder === FOLDERS[0] ? files : files.filter((file) => file.folder === activeFolder);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;

    setUploading(true);
    try {
      const folder = activeFolder === FOLDERS[0] ? null : activeFolder;
      const created = await uploadMaterial(user.id, file, folder);
      setFiles((prev) => [created, ...prev]);
      showToast(`${file.name} 업로드가 완료되었습니다`);
    } catch {
      showError('파일 업로드에 실패했습니다');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: MaterialRow) => {
    try {
      const url = await getMaterialDownloadUrl(file.storagePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      showError('다운로드 링크 생성에 실패했습니다');
    }
  };

  const handleDelete = async (file: MaterialRow) => {
    const confirmed = await showConfirm(`'${file.fileName}' 파일을 삭제하시겠습니까?`);
    if (!confirmed) return;
    try {
      await deleteMaterial(file.id, file.storagePath);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      showToast('파일이 삭제되었습니다');
    } catch {
      showError('파일 삭제에 실패했습니다');
    }
  };

  return (
    <PageContent loading={loading}>
    <main className="mx-auto min-h-screen w-full max-w-[1200px] bg-background px-container-margin pb-32 pt-stack-lg font-body-md text-on-background">
      <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => void handleUploadChange(event)} />

      <section className="mb-8 flex items-center gap-3">
        <Link href="/teacher/profile" className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container" aria-label="뒤로가기">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">자료실</h1>
          <p className="mt-1 text-sm text-on-surface-variant">총 {files.length}개의 파일</p>
        </div>
      </section>

      <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">자료 관리</h2>
          <p className="mt-1 text-sm text-on-surface-variant">수업에 사용할 교재와 미디어 파일을 정리하세요.</p>
        </div>
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          className="flex items-center justify-center gap-2 rounded-xl primary-gradient-btn px-6 py-3 font-bold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 600" }}>
            upload_file
          </span>
          {uploading ? '업로드 중...' : '새 자료 업로드'}
        </button>
      </section>

      <section className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto pb-2">
        {FOLDERS.map((folder) => {
          const active = activeFolder === folder;
          return (
            <button
              key={folder}
              type="button"
              onClick={() => setActiveFolder(folder)}
              aria-pressed={active}
              className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm transition-colors ${
                active ? 'bg-primary font-semibold text-on-primary' : 'bg-surface-container-high font-medium text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {folder}
            </button>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="hidden grid-cols-12 gap-4 border-b border-outline-variant/30 px-6 py-2 text-sm font-semibold text-on-surface-variant md:grid">
          <div className="col-span-6">파일명</div>
          <div className="col-span-2 text-center">용량</div>
          <div className="col-span-2 text-center">날짜</div>
          <div className="col-span-2 text-right">관리</div>
        </div>

        {loading && <p className="py-10 text-center font-body-md text-on-surface-variant">불러오는 중...</p>}
        {!loading && visibleFiles.length === 0 && (
          <p className="py-10 text-center font-body-md text-on-surface-variant">이 폴더에 파일이 없습니다.</p>
        )}

        {visibleFiles.map((file) => {
          const { icon, className } = fileIcon(file.fileName);
          return (
            <article
              key={file.id}
              className="grid grid-cols-12 items-center gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md md:px-6 md:py-4"
            >
              <div className="col-span-12 flex items-center gap-4 md:col-span-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${className}`}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-on-surface">{file.fileName}</h3>
                  <p className="mt-0.5 text-xs text-on-surface-variant md:hidden">
                    {file.fileSize} • {new Date(file.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
              <div className="hidden text-center text-sm text-on-surface-variant md:col-span-2 md:block">{file.fileSize}</div>
              <div className="hidden text-center text-sm text-on-surface-variant md:col-span-2 md:block">
                {new Date(file.createdAt).toLocaleDateString('ko-KR')}
              </div>
              <div className="col-span-12 flex items-center justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(file)}
                  className="rounded-lg p-2 text-primary transition-colors hover:bg-surface-container"
                  aria-label={`${file.fileName} 다운로드`}
                >
                  <span className="material-symbols-outlined">download</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(file)}
                  className="rounded-lg p-2 text-error transition-colors hover:bg-error-container/20"
                  aria-label={`${file.fileName} 삭제`}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="relative mt-12 flex flex-col items-center gap-8 overflow-hidden rounded-xl bg-primary-fixed p-8 md:flex-row">
        <div className="relative z-10 flex-1">
          <h2 className="font-headline-md text-xl font-bold text-on-primary-fixed">더 많은 저장공간이 필요하신가요?</h2>
          <p className="mb-6 mt-2 text-on-primary-fixed-variant">프로 선생님 플랜으로 업그레이드하고 최대 50GB의 저장공간과 고화질 동영상 업로드 기능을 이용해 보세요.</p>
          <button
            type="button"
            onClick={() => showToast('플랜 업그레이드는 준비 중입니다')}
            className="rounded-lg bg-primary px-6 py-2.5 font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-[0.98]"
          >
            플랜 업그레이드
          </button>
        </div>
        <div className="relative h-48 w-48 shrink-0">
          <div className="absolute inset-0 rounded-full bg-secondary/10"></div>
          <div className="absolute inset-4 rounded-full bg-primary/20"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'wght' 200" }}>
              cloud_done
            </span>
          </div>
        </div>
        <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-white/20"></div>
      </section>
    </main>
    </PageContent>
  );
}
