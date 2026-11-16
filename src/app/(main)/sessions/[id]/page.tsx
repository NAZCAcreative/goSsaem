"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ServicePage,
  actionClass,
  fieldClass,
} from "@/components/shared/ServicePage";
import {
  sessionAccess,
  setMeeting,
  type SessionAccess,
} from "@/lib/queries/launch";
import { formatLessonTime } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { SessionMaterials } from "@/components/features/SessionMaterials";

export default function Page() {
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [session, setSession] = useState<SessionAccess | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () =>
      sessionAccess(params.id)
        .then((result) => {
          if (active) {
            setSession(result);
            setError("");
          }
        })
        .catch((cause) => {
          if (active) {
            setSession(null);
            setError(cause.message);
          }
        });
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [params.id, user, refresh]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await setMeeting(params.id, url);
      setMessage("수업 링크가 저장되었습니다.");
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ServicePage
      title={session?.title || "수업 대기실"}
      description="카메라·마이크와 인터넷 연결을 확인해주세요."
    >
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {session && (
        <>
          <div className="rounded-xl border border-outline-variant/30 bg-surface p-6">
            <p className="font-semibold">
              {formatLessonTime(session.scheduledAt)}
            </p>
            <p className="mt-2">{session.durationMinutes}분 수업</p>
            <p className="mt-3 text-on-surface-variant">
              입장: {formatLessonTime(session.opensAt)}부터{" "}
              {formatLessonTime(session.closesAt)}까지
            </p>
          </div>
          {session.canJoin && session.meetingUrl ? (
            <a
              className={actionClass}
              href={session.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              수업방 입장 ↗
            </a>
          ) : (
            <p role="status">
              {["completed", "cancelled"].includes(session.status)
                ? "종료되었거나 취소된 수업입니다."
                : "입장 시간과 선생님의 링크 등록을 확인해주세요. 30초마다 입장 가능 여부를 갱신합니다."}
            </p>
          )}
          {session.isTeacher &&
            ["scheduled", "ongoing"].includes(session.status) && (
              <form onSubmit={save} className="max-w-xl space-y-4">
                <label className="block font-semibold">
                  수업 회의 링크
                  <input
                    type="url"
                    required
                    maxLength={2000}
                    value={url}
                    placeholder="https://meet.google.com/..."
                    onChange={(event) => setUrl(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <p className="text-sm text-on-surface-variant">
                  Google Meet·Zoom·Teams 링크를 등록하세요. 회의 서비스의
                  대기실과 참가자 승인을 함께 사용해주세요.{" "}
                  {session.meetingUrl
                    ? "등록된 링크가 있습니다."
                    : "아직 링크가 등록되지 않았습니다."}
                </p>
                <button disabled={busy} className={actionClass}>
                  {busy ? "저장 중..." : "링크 저장"}
                </button>
                {message && (
                  <p role="status" className="text-primary">
                    {message}
                  </p>
                )}
              </form>
            )}
          {session.isTeacher && (
            <Link
              className="inline-flex min-h-11 items-center text-primary"
              href={`/teacher/lessons/attendance?session=${session.id}`}
            >
              출석 관리
            </Link>
          )}
          <SessionMaterials
            sessionId={session.id}
            isTeacher={session.isTeacher}
          />
        </>
      )}
      <Link
        className="inline-flex min-h-11 items-center text-primary"
        href="/support"
      >
        접속 문제 문의
      </Link>
    </ServicePage>
  );
}
