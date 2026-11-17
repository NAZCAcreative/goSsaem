import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { backend } from "./lib/backend";
import { useRemote } from "./lib/use-remote";
import {
  Body,
  Button,
  Card,
  Heading,
  Input,
  Loading,
  Note,
  colors,
  s,
} from "./ui";
type Room = {
  id: string;
  otherUserName: string;
  lastMessagePreview: string | null;
  unreadCount: number;
};
type Message = {
  id: string;
  sender_id: string;
  text: string | null;
  created_at: string;
};
export function ChatScreen({
  userId,
  roomId,
  onRoom,
  refreshKey,
}: {
  userId: string;
  roomId?: string;
  onRoom: (id?: string) => void;
  refreshKey: number;
}) {
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    const { data, error } = await backend().rpc("my_chat_rooms", {
      p_role: "teacher",
      p_page: page,
      p_query: "",
      p_unread: false,
    });
    if (error) throw error;
    return data as Room[];
  }, [page, refreshKey]);
  const list = useRemote(load);
  if (roomId)
    return (
      <Conversation
        key={roomId}
        userId={userId}
        roomId={roomId}
        refreshKey={refreshKey}
        onBack={() => onRoom()}
      />
    );
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Heading>채팅</Heading>
      <Button title="새로고침" secondary onPress={list.reload} />
      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <Note error>{list.error}</Note>
      ) : !list.data?.length ? (
        <Card>
          <Body>
            연결된 채팅이 없습니다. 학생이 메시지를 보내면 여기에 표시됩니다.
          </Body>
        </Card>
      ) : (
        list.data.map((room) => (
          <Card key={room.id}>
            <Heading>{room.otherUserName}</Heading>
            <Body>{room.lastMessagePreview || "대화를 시작해보세요."}</Body>
            <Button
              title={
                room.unreadCount
                  ? `대화 열기 · 읽지 않음 ${room.unreadCount}`
                  : "대화 열기"
              }
              onPress={() => onRoom(room.id)}
            />
          </Card>
        ))
      )}
      <View style={s.row}>
        <Button
          title="이전"
          secondary
          disabled={page === 1 || list.loading}
          onPress={() => setPage((value) => value - 1)}
        />
        <Note>{page}페이지</Note>
        <Button
          title="다음"
          secondary
          disabled={list.loading || (list.data?.length ?? 0) < 20}
          onPress={() => setPage((value) => value + 1)}
        />
      </View>
    </ScrollView>
  );
}
function Conversation({
  userId,
  roomId,
  onBack,
  refreshKey,
}: {
  userId: string;
  roomId: string;
  onBack: () => void;
  refreshKey: number;
}) {
  const [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [hasMore, setHasMore] = useState(true),
    [name, setName] = useState("대화");
  const lock = useRef(false),
    scroll = useRef<React.ComponentRef<typeof ScrollView>>(null),
    active = useRef(true);
  const lastRefresh = useRef(refreshKey);
  const fetchMessages = useCallback(
    async (older?: Message) => {
      const { data, error } = await backend().rpc("chat_message_page", {
        p_room: roomId,
        p_before: older?.created_at || null,
        p_before_id: older?.id || null,
      });
      if (error) throw error;
      const rows = (data as unknown as Message[]).slice().reverse();
      if (!active.current) return;
      setHasMore(rows.length === 50);
      setMessages((previous) => {
        const combined = older
          ? [...rows, ...previous]
          : [...previous, ...rows];
        return [...new Map(combined.map((row) => [row.id, row])).values()].sort(
          (a, b) =>
            a.created_at.localeCompare(b.created_at) ||
            a.id.localeCompare(b.id),
        );
      });
      const read = await backend()
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .neq("sender_id", userId)
        .is("read_at", null);
      if (read.error) throw read.error;
    },
    [roomId, userId],
  );
  useEffect(() => {
    if (lastRefresh.current === refreshKey) return;
    lastRefresh.current = refreshKey;
    void fetchMessages().catch(() => {
      if (active.current) setError("메시지를 새로고침하지 못했습니다.");
    });
  }, [refreshKey, fetchMessages]);
  useEffect(() => {
    active.current = true;
    setLoading(true);
    setError("");
    void Promise.resolve(
      backend()
        .from("chat_rooms")
        .select("teacher_id,student_id,profiles!student_id(name)")
        .eq("id", roomId)
        .eq("teacher_id", userId)
        .maybeSingle(),
    )
      .then(async ({ data, error }) => {
        if (error || !data) throw new Error("접근할 수 없는 대화입니다.");
        if (active.current) {
          const profile = Array.isArray(data.profiles)
            ? data.profiles[0]
            : data.profiles;
          setName(profile?.name || "학생");
        }
        await fetchMessages();
      })
      .catch(() => {
        if (active.current) setError("대화를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active.current) setLoading(false);
      });
    const channel = backend()
      .channel(`mobile-chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void fetchMessages().catch(() => {
            if (active.current) setError("메시지를 새로고침하지 못했습니다.");
          });
        },
      )
      .subscribe();
    return () => {
      active.current = false;
      void backend().removeChannel(channel);
    };
  }, [roomId, userId, fetchMessages]);
  const send = async () => {
    if (lock.current || !draft.trim()) return;
    const text = draft.trim();
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await backend()
        .from("chat_messages")
        .insert({ room_id: roomId, sender_id: userId, type: "text", text })
        .select("id,sender_id,text,created_at")
        .single();
      if (result.error) throw result.error;
      if (active.current) {
        setMessages((values) => [
          ...values.filter((value) => value.id !== result.data.id),
          result.data,
        ]);
        setDraft("");
        scroll.current?.scrollToEnd({ animated: true });
      }
    } catch {
      if (active.current)
        setError(
          "전송 결과를 확인하지 못했습니다. 대화를 새로고침해 중복 여부를 확인한 뒤 다시 보내주세요.",
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ padding: 18, gap: 10 }}>
        <Button
          title="← 대화 목록"
          secondary
          onPress={() => {
            if (draft.trim())
              Alert.alert(
                "작성 중인 메시지",
                "목록으로 이동하면 작성 중인 내용이 사라집니다.",
                [
                  { text: "계속 작성", style: "cancel" },
                  { text: "이동", onPress: onBack },
                ],
              );
            else onBack();
          }}
        />
        <Heading>{name}</Heading>
        {error && <Note error>{error}</Note>}
        <Button
          title="대화 새로고침"
          secondary
          disabled={loading || busy}
          onPress={() =>
            void fetchMessages().catch(() =>
              setError("새로고침하지 못했습니다."),
            )
          }
        />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 18, gap: 12 }}>
        {loading ? (
          <Loading />
        ) : (
          <>
            {hasMore && messages.length > 0 && (
              <Button
                title="이전 메시지"
                secondary
                disabled={busy}
                onPress={() =>
                  void fetchMessages(messages[0]).catch(() =>
                    setError("이전 메시지를 불러오지 못했습니다."),
                  )
                }
              />
            )}{" "}
            {messages.map((message) => (
              <View
                key={message.id}
                style={{
                  alignSelf:
                    message.sender_id === userId ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor:
                    message.sender_id === userId ? "#ede9fe" : "white",
                }}
              >
                <Text style={{ color: colors.ink, lineHeight: 22 }}>
                  {message.text}
                </Text>
                <Note>
                  {new Date(message.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Note>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <View
        style={{
          padding: 16,
          gap: 8,
          borderTopWidth: 1,
          borderColor: colors.border,
          backgroundColor: "white",
        }}
      >
        <Input
          accessibilityLabel="메시지 입력"
          placeholder="메시지를 입력하세요"
          multiline
          maxLength={4000}
          editable={!busy}
          value={draft}
          onChangeText={setDraft}
        />
        <Button
          title={busy ? "전송 중…" : "메시지 보내기"}
          disabled={busy || loading || !draft.trim() || draft.length > 4000}
          onPress={() => void send()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
