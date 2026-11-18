import { useCallback, useRef, useState } from "react";
import { Linking, ScrollView, Switch, View } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { backend, installationId } from "./lib/backend";
import { useRemote } from "./lib/use-remote";
import { notificationDestination, type Destination } from "./lib/navigation";
import {
  localPushTest,
  registerPush,
  remotePushTest,
  disconnectPush,
} from "./lib/push";
import { Body, Button, Card, Heading, Input, Loading, Note, s } from "./ui";
type Props = {
  userId: string;
  refreshKey: number;
  navigate: (value: Destination) => void;
  openWeb: (path: string) => void;
};
const time = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }) + " KST";
export function HomeScreen({ userId, refreshKey, navigate, openWeb }: Props) {
  const load = useCallback(async () => {
    const [profile, summary, prep] = await Promise.all([
      backend().from("profiles").select("name").eq("id", userId).single(),
      backend().rpc("my_review_summary"),
      backend().rpc("my_teacher_preparation"),
    ]);
    if (profile.error || summary.error || prep.error)
      throw new Error("Home unavailable");
    return {
      name: profile.data.name,
      summary: summary.data as { total: number; unanswered: number },
      prep: prep.data as {
        id: string;
        title: string;
        kind: string;
        scheduledAt: string;
      }[],
    };
  }, [userId, refreshKey]);
  const state = useRemote(load);
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Heading>쌤 작업 공간</Heading>
      <Note>신청·메시지·수업 준비를 휴대폰에서 확인하세요.</Note>
      <Button title="새로고침" secondary onPress={state.reload} />
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <Note error>{state.error}</Note>
      ) : (
        state.data && (
          <>
            <Card>
              <Heading>{state.data.name} 쌤</Heading>
              <Button
                title="수업 신청·예약 확인"
                onPress={() => navigate({ tab: "bookings" })}
              />
              <Button
                title="채팅 확인"
                secondary
                onPress={() => navigate({ tab: "chat" })}
              />
              <Button
                title={`후기 답변 · 미답변 ${state.data.summary.unanswered}개`}
                secondary
                onPress={() => openWeb("/teacher/profile/reviews")}
              />
            </Card>
            <Card>
              <Heading>확인이 필요한 수업</Heading>
              {state.data.prep.length ? (
                state.data.prep.map((item) => (
                  <View key={item.id} style={{ gap: 8, paddingVertical: 8 }}>
                    <Body>{item.title}</Body>
                    <Note>{time(item.scheduledAt)}</Note>
                    <Button
                      title={
                        item.kind === "meeting"
                          ? "수업 링크 등록 · 웹"
                          : "출석 확정 · 웹"
                      }
                      secondary
                      onPress={() =>
                        openWeb(
                          item.kind === "meeting"
                            ? `/sessions/${item.id}`
                            : `/teacher/lessons/attendance?session=${item.id}`,
                        )
                      }
                    />
                  </View>
                ))
              ) : (
                <Body>현재 확인이 필요한 수업이 없습니다.</Body>
              )}
            </Card>
          </>
        )
      )}
      <Card>
        <Heading>웹 작업 공간</Heading>
        <Note>
          프로필·자료·정산 등 기존 기능은 웹에서 이용합니다. 브라우저에서는 별도
          로그인이 필요할 수 있습니다.
        </Note>
        <Button
          title="전체 대시보드 열기"
          secondary
          onPress={() => openWeb("/teacher/home")}
        />
        <Button
          title="수익·정산 열기"
          secondary
          onPress={() => openWeb("/teacher/settlement")}
        />
      </Card>
    </ScrollView>
  );
}
export function NotificationsScreen({
  userId,
  refreshKey,
  navigate,
  openWeb,
}: Props) {
  const [page, setPage] = useState(1),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await backend()
      .from("notifications")
      .select("id,title,body,link_url,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * 20, page * 20 - 1);
    if (error) throw error;
    return data;
  }, [userId, page, refreshKey]);
  const state = useRemote(load);
  const open = async (row: NonNullable<typeof state.data>[number]) => {
    const { error } = await backend()
      .from("notifications")
      .update({ is_read: true })
      .eq("id", row.id)
      .eq("user_id", userId);
    if (error) {
      setMessage("읽음 표시를 저장하지 못했습니다.");
      return;
    }
    const target = notificationDestination(row.link_url);
    if (target.path) openWeb(target.path);
    else navigate(target);
    state.reload();
  };
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Heading>알림함</Heading>
      <Button title="새로고침" secondary onPress={state.reload} />
      {message && <Note error>{message}</Note>}
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <Note error>{state.error}</Note>
      ) : state.data?.length ? (
        state.data.map((row) => (
          <Card key={row.id}>
            <Heading>
              {row.is_read ? "" : "● "}
              {row.title}
            </Heading>
            <Body>{row.body}</Body>
            <Note>{time(row.created_at)}</Note>
            <Button
              title="내용 확인"
              secondary
              onPress={() => void open(row)}
            />
          </Card>
        ))
      ) : (
        <Card>
          <Body>도착한 알림이 없습니다.</Body>
        </Card>
      )}
      <View style={s.row}>
        <Button
          title="이전"
          secondary
          disabled={page === 1 || state.loading}
          onPress={() => setPage((p) => p - 1)}
        />
        <Note>{page}페이지</Note>
        <Button
          title="다음"
          secondary
          disabled={state.loading || (state.data?.length ?? 0) < 20}
          onPress={() => setPage((p) => p + 1)}
        />
      </View>
    </ScrollView>
  );
}
type Booking = {
  id: string;
  status: string;
  sessionId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  studentName: string;
};
export function BookingsScreen({
  userId,
  refreshKey,
  openWeb,
  sessionId,
  path,
}: Props & { sessionId?: string; path?: string }) {
  const [page, setPage] = useState(1),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await backend().rpc("my_mobile_bookings", {
      p_page: page,
    });
    if (error) throw error;
    return data as Booking[];
  }, [userId, page, refreshKey]);
  const state = useRemote(load);
  const enter = async (id: string) => {
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await backend().rpc("session_access", {
        p_session: id,
      });
      if (error) throw error;
      const access = data as {
        canJoin: boolean;
        meetingUrl: string | null;
        opensAt: string;
      };
      if (!access.canJoin || !access.meetingUrl) {
        setMessage(
          `입장 가능 시간 또는 수업 링크를 확인해주세요. 입장 시작: ${time(access.opensAt)}`,
        );
        return;
      }
      const url = new URL(access.meetingUrl);
      if (
        url.protocol !== "https:" ||
        !/^(meet\.google\.com|([a-z0-9-]+\.)*zoom\.us|teams\.microsoft\.com)$/.test(
          url.hostname,
        ) ||
        url.username ||
        url.password
      )
        throw new Error("Invalid meeting");
      await Linking.openURL(url.toString());
    } catch {
      setMessage(
        "수업 입장 정보를 확인하지 못했습니다. 웹 대기실을 확인해주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  const labels: Record<string, string> = {
    pending_payment: "신청 · 결제 대기",
    confirmed: "예약 확정",
    completed: "수업 완료",
    cancelled: "취소",
    no_show: "결석",
  };
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Heading>수업 신청·예약</Heading>
      <Note>
        신청과 확정은 다릅니다. 결제 대기는 아직 수업 예약이 확정되지 않은
        상태입니다.
      </Note>
      {(sessionId || path) && (
        <Card>
          <Heading>알림에서 선택한 수업</Heading>
          {sessionId && (
            <Button
              title="수업 입장 확인"
              disabled={busy}
              onPress={() => void enter(sessionId)}
            />
          )}
          <Button
            title="해당 수업 웹 화면 열기"
            secondary
            onPress={() =>
              openWeb(
                path || `/teacher/lessons/attendance?session=${sessionId}`,
              )
            }
          />
        </Card>
      )}
      <Button title="새로고침" secondary onPress={state.reload} />
      {message && <Note>{message}</Note>}
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <Note error>{state.error}</Note>
      ) : state.data?.length ? (
        state.data.map((row) => (
          <Card key={row.id}>
            <Heading>{row.title}</Heading>
            <Body>
              {row.studentName} · {labels[row.status] || row.status}
            </Body>
            <Body>
              {time(row.scheduledAt)} · {row.durationMinutes}분
            </Body>
            {row.status === "confirmed" && (
              <Button
                title="수업 입장 확인"
                disabled={busy}
                onPress={() => void enter(row.sessionId)}
              />
            )}
            <Button
              title="출석·수업 관리 · 웹"
              secondary
              onPress={() =>
                openWeb(`/teacher/lessons/attendance?session=${row.sessionId}`)
              }
            />
          </Card>
        ))
      ) : (
        <Card>
          <Body>아직 수업 신청·예약이 없습니다.</Body>
        </Card>
      )}
      <View style={s.row}>
        <Button
          title="이전"
          secondary
          disabled={page === 1 || state.loading}
          onPress={() => setPage((p) => p - 1)}
        />
        <Note>{page}페이지</Note>
        <Button
          title="다음"
          secondary
          disabled={state.loading || (state.data?.length ?? 0) < 20}
          onPress={() => setPage((p) => p + 1)}
        />
      </View>
    </ScrollView>
  );
}
type Settings = {
  enabled: boolean;
  chat_message: boolean;
  booking_status: boolean;
  lesson_reminder: boolean;
  payment: boolean;
  settlement: boolean;
  quiet_start: number | null;
  quiet_end: number | null;
  time_zone: string;
};
const defaultSettings: Settings = {
  enabled: true,
  chat_message: true,
  booking_status: true,
  lesson_reminder: true,
  payment: true,
  settlement: true,
  quiet_start: null,
  quiet_end: null,
  time_zone: "Asia/Seoul",
};
export function SettingsScreen({
  userId,
  onLogout,
  onPushStatus,
}: {
  userId: string;
  onLogout: () => Promise<void>;
  onPushStatus: (message: string) => void;
}) {
  const [settings, setSettings] = useState<Settings>(defaultSettings),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [start, setStart] = useState("22:00"),
    [end, setEnd] = useState("08:00");
  const lock = useRef(false);
  const load = useCallback(async () => {
    const { data, error } = await backend()
      .from("mobile_push_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    const value = data || defaultSettings;
    setSettings(value);
    const text = (minutes: number) =>
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    if (value.quiet_start !== null) setStart(text(value.quiet_start));
    if (value.quiet_end !== null) setEnd(text(value.quiet_end));
    return value;
  }, [userId]);
  const state = useRemote(load);
  const run = async (action: () => Promise<string | void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      if (result) setMessage(result);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "요청하지 못했습니다.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      const minutes = (value: string) => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
          throw new Error("시간은 HH:MM 형식으로 입력해주세요.");
        const [h, m] = value.split(":").map(Number);
        return h * 60 + m;
      };
      const next = { ...settings };
      if (next.quiet_start !== null) {
        next.quiet_start = minutes(start);
        next.quiet_end = minutes(end);
        if (next.quiet_start === next.quiet_end)
          throw new Error("조용한 시간의 시작과 끝은 달라야 합니다.");
      }
      const { error } = await backend()
        .from("mobile_push_settings")
        .upsert({ user_id: userId, ...next });
      if (error) throw new Error("설정을 저장하지 못했습니다.");
      setSettings(next);
      return "알림 설정을 저장했습니다.";
    });
  const version =
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    "0.1.0";
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Heading>알림 설정·테스트</Heading>
      <Card>
        <Body>
          버전 {version} · 빌드 {Application.nativeBuildVersion || "개발"}
        </Body>
        <Note>
          환경: {Constants.expoConfig?.extra?.releaseChannel || "preview"}
        </Note>
        <Button
          title="휴대폰 알림 허용·기기 등록"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await registerPush(true);
              onPushStatus("기기 등록 완료");
              return "기기를 등록했습니다. 이제 원격 푸시 테스트를 할 수 있습니다.";
            })
          }
        />
        <Button
          title="5초 후 로컬 알림 테스트"
          secondary
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await localPushTest();
              return "5초 후 표시됩니다. 이 테스트는 서버·Firebase 연결을 검사하지 않습니다.";
            })
          }
        />
        <Button
          title="채팅 원격 푸시 테스트"
          secondary
          disabled={busy}
          onPress={() => void run(() => remotePushTest("chat_message"))}
        />
        <Button
          title="수업 신청 원격 푸시 테스트"
          secondary
          disabled={busy}
          onPress={() => void run(() => remotePushTest("booking_status"))}
        />
        <Button
          title="최근 푸시 발송 상태 확인"
          secondary
          disabled={busy}
          onPress={() =>
            void run(async () => {
              const { data, error } = await backend().rpc(
                "my_mobile_push_diagnostics",
                { p_device: await installationId() },
              );
              if (error)
                throw new Error("푸시 발송 상태를 불러오지 못했습니다.");
              const rows = data as {
                status: string;
                errorCode: string | null;
                createdAt: string;
              }[];
              const labels: Record<string, string> = {
                pending: "발송 대기",
                sending: "발송 중",
                accepted: "Expo 접수",
                provider_accepted: "Google·Apple 전달 접수",
                failed: "실패",
                skipped: "발송 생략",
                uncertain: "결과 불확실",
              };
              return rows.length
                ? rows
                    .map(
                      (row) =>
                        `${time(row.createdAt)} · ${labels[row.status] || row.status}${row.errorCode ? ` (${row.errorCode})` : ""}`,
                    )
                    .join("\n") +
                    "\n접수 상태는 휴대폰 표시 완료를 보장하지 않습니다."
                : "이 기기의 푸시 발송 기록이 없습니다.";
            })
          }
        />
        <Note>
          원격 테스트는 본인에게만 전송하며 실제 메시지나 예약을 생성하지
          않습니다. 조용한 시간과 수신 설정을 따릅니다.
        </Note>
      </Card>
      {message && (
        <Card>
          <Body>{message}</Body>
        </Card>
      )}
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <Card>
          <Note error>{state.error}</Note>
          <Button title="설정 다시 불러오기" secondary onPress={state.reload} />
        </Card>
      ) : (
        <Card>
          <Heading>받을 알림</Heading>
          {(
            [
              ["enabled", "전체 푸시"],
              ["chat_message", "새 채팅"],
              ["booking_status", "수업 신청·예약"],
              ["lesson_reminder", "수업 시작"],
              ["payment", "결제"],
              ["settlement", "정산"],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={s.row}>
              <Body>{label}</Body>
              <Switch
                accessibilityLabel={label}
                disabled={busy}
                value={settings[key]}
                onValueChange={(value) =>
                  setSettings((previous) => ({ ...previous, [key]: value }))
                }
              />
            </View>
          ))}
          <View style={s.row}>
            <Body>조용한 시간 사용</Body>
            <Switch
              accessibilityLabel="조용한 시간 사용"
              disabled={busy}
              value={settings.quiet_start !== null}
              onValueChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  quiet_start: value ? 1320 : null,
                  quiet_end: value ? 480 : null,
                }))
              }
            />
          </View>
          {settings.quiet_start !== null && (
            <>
              <Input
                accessibilityLabel="조용한 시간 시작"
                value={start}
                onChangeText={setStart}
                placeholder="22:00"
                maxLength={5}
              />
              <Input
                accessibilityLabel="조용한 시간 종료"
                value={end}
                onChangeText={setEnd}
                placeholder="08:00"
                maxLength={5}
              />
              <Note>
                시간대: {settings.time_zone}. 조용한 시간에는 푸시 발송을
                보류하며 오래된 수업 시작 알림은 생략합니다.
              </Note>
            </>
          )}
          <Button
            title="알림 설정 저장"
            disabled={busy}
            onPress={() => void save()}
          />
        </Card>
      )}
      <Card>
        <Button
          title="이 기기의 푸시 연결 해제"
          secondary
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await disconnectPush();
              onPushStatus("기기 연결 해제됨");
              return "이 기기의 푸시 연결을 해제했습니다.";
            })
          }
        />
        <Button
          title="로그아웃"
          secondary
          disabled={busy}
          onPress={() => void run(onLogout)}
        />
      </Card>
    </ScrollView>
  );
}
