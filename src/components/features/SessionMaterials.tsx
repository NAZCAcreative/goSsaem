"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listMaterials,
  getMaterialDownloadUrl,
  type MaterialRow,
} from "@/lib/queries/materials";
import { useAuthStore } from "@/stores/auth-store";
type SharedMaterial = {
  id: string;
  fileName: string;
  storagePath: string;
  fileSize: string;
};
export function SessionMaterials({
  sessionId,
  isTeacher,
}: {
  sessionId: string;
  isTeacher: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const [shared, setShared] = useState<SharedMaterial[]>([]);
  const [mine, setMine] = useState<MaterialRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [download, setDownload] = useState<{ id: string; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([
      createClient().rpc("session_material_list", { p_session: sessionId }),
      isTeacher ? listMaterials(user.id) : Promise.resolve([]),
    ])
      .then(([result, all]) => {
        if (!active) return;
        if (result.error) throw new Error();
        setShared(result.data as unknown as SharedMaterial[]);
        setMine(all);
      })
      .catch(() => {
        if (active) setError("수업 자료를 불러오지 못했습니다.");
      });
    return () => {
      active = false;
    };
  }, [sessionId, isTeacher, user, refresh]);
  const toggle = async (id: string, checked: boolean) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await createClient().rpc("share_session_material", {
        p_session: sessionId,
        p_material: id,
        p_share: checked,
      });
      if (error) throw new Error();
      setRefresh((value) => value + 1);
    } catch {
      setError("자료 공유를 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">수업 자료</h2>
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {shared.length === 0 && (
        <p className="text-on-surface-variant">공유된 자료가 없습니다.</p>
      )}
      {shared.map((material) => (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/30 p-4"
          key={material.id}
        >
          <div className="min-w-0">
            <p className="break-words font-semibold">{material.fileName}</p>
            <p className="text-sm text-on-surface-variant">
              {material.fileSize}
            </p>
          </div>
          {download?.id === material.id ? (
            <a
              className="inline-flex min-h-11 items-center text-primary"
              href={download.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              파일 열기 ↗
            </a>
          ) : (
            <button
              disabled={busy}
              className="min-h-11 text-primary"
              onClick={() => {
                setBusy(true);
                void getMaterialDownloadUrl(material.storagePath)
                  .then((url) => setDownload({ id: material.id, url }))
                  .catch(() => setError("다운로드 링크를 만들지 못했습니다."))
                  .finally(() => setBusy(false));
              }}
            >
              다운로드 준비
            </button>
          )}
        </div>
      ))}
      {isTeacher && (
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-2 font-semibold">
            보관함에서 공유할 자료 선택
          </legend>
          {mine.length === 0 && (
            <p className="text-sm text-on-surface-variant">
              내 자료 보관함에 파일을 먼저 올려주세요.
            </p>
          )}
          {mine.map((material) => (
            <label
              className="flex min-h-11 items-center gap-3"
              key={material.id}
            >
              <input
                type="checkbox"
                checked={shared.some((item) => item.id === material.id)}
                onChange={(event) =>
                  void toggle(material.id, event.target.checked)
                }
              />
              <span className="min-w-0 break-words">{material.fileName}</span>
            </label>
          ))}
        </fieldset>
      )}
    </section>
  );
}
