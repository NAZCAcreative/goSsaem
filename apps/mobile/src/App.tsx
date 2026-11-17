import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import { backend, configReady, webOrigin } from "./lib/backend";
import {
  notificationDestination,
  trustedWebUrl,
  type Destination,
} from "./lib/navigation";
import { disconnectPush, registerPush } from "./lib/push";
import { ChatScreen } from "./ChatScreen";
import {
  BookingsScreen,
  HomeScreen,
  NotificationsScreen,
  SettingsScreen,
} from "./Screens";
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

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={s.page}>
        {configReady ? (
          <TeacherApp />
        ) : (
          <ScrollView contentContainerStyle={s.content}>
            <Card>
              <Heading>고쌤 앱 연결 준비</Heading>
              <Body>앱의 Supabase 연결 설정이 비어 있습니다.</Body>
              <Note>
                apps/mobile/.env.example을 .env로 복사하고 공개 연결 주소와 anon
                키를 설정한 뒤 앱을 다시 실행해주세요. 서버 비밀 키는 앱에 넣지
                않습니다.
              </Note>
            </Card>
          </ScrollView>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function TeacherApp() {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [role, setRole] = useState<"checking" | "teacher" | "denied" | "error">(
      "checking",
    ),
    [profileRetry, setProfileRetry] = useState(0),
    [destination, setDestination] = useState<Destination>({ tab: "home" }),
    [refresh, setRefresh] = useState(0),
    [pushStatus, setPushStatus] = useState(
      "설정에서 알림 수신을 허용해주세요.",
    );
  const [pending, setPending] = useState<
    Notifications.NotificationContent["data"] | null
  >(null);
  const handled = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    backend()
      .auth.getSession()
      .then(({ data, error }) => {
        if (active) {
          if (error)
            Alert.alert("로그인 확인", "저장된 로그인을 확인하지 못했습니다.");
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    const {
      data: { subscription },
    } = backend().auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        setLoading(false);
        if (!next) {
          setRole("checking");
          setDestination({ tab: "home" });
        }
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session) {
      setRole("checking");
      return;
    }
    let active = true;
    setRole("checking");
    void backend()
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (active)
          setRole(
            error ? "error" : data?.role === "teacher" ? "teacher" : "denied",
          );
      });
    return () => {
      active = false;
    };
  }, [session?.user.id, profileRetry]);
  const openWeb = useCallback((path: string) => {
    try {
      const url = trustedWebUrl(path, webOrigin);
      void Linking.openURL(url).catch(() =>
        Alert.alert("이동 실패", "웹 페이지를 열지 못했습니다."),
      );
    } catch (error) {
      Alert.alert(
        "웹 연결 확인",
        error instanceof Error ? error.message : "웹 주소를 확인해주세요.",
      );
    }
  }, []);
  const navigate = useCallback(
    (next: Destination) => {
      if (next.path && next.tab !== "bookings") openWeb(next.path);
      else setDestination(next);
    },
    [openWeb],
  );
  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current.has(id)) return;
      handled.current.add(id);
      if (handled.current.size > 100)
        handled.current.delete(handled.current.values().next().value!);
      setPending(response.notification.request.content.data);
      void Notifications.clearLastNotificationResponseAsync();
    };
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handle(response);
    });
    const received = Notifications.addNotificationReceivedListener(() =>
      setRefresh((value) => value + 1),
    );
    return () => {
      subscription.remove();
      received.remove();
    };
  }, []);
  useEffect(() => {
    if (!pending || !session || role !== "teacher") return;
    // A notification belonging to a previous account must never open its data.
    if (pending.userId === session.user.id)
      navigate(notificationDestination(pending.linkUrl));
    if (
      pending.userId === session.user.id &&
      typeof pending.notificationId === "string" &&
      /^[0-9a-f-]{36}$/i.test(pending.notificationId)
    )
      void backend()
        .from("notifications")
        .update({ is_read: true })
        .eq("id", pending.notificationId)
        .eq("user_id", session.user.id)
        .then(() => {});
    setPending(null);
  }, [pending, session?.user.id, role, navigate]);
  useEffect(() => {
    if (!session || role !== "teacher") return;
    let active = true;
    const sync = () => {
      void registerPush(false)
        .then((value) => {
          if (active && value)
            setPushStatus("이 기기에 푸시가 연결되어 있습니다.");
        })
        .catch(() => {
          if (active)
            setPushStatus(
              "푸시 연결을 확인해주세요. 설정에서 다시 등록할 수 있습니다.",
            );
        });
    };
    sync();
    const foreground = AppState.addEventListener("change", (value) => {
      if (value === "active") {
        setRefresh((n) => n + 1);
        sync();
      }
    });
    const tokenChanged = Notifications.addPushTokenListener(sync);
    const channel = backend()
      .channel(`mobile-notifications-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => setRefresh((value) => value + 1),
      )
      .subscribe();
    return () => {
      active = false;
      foreground.remove();
      tokenChanged.remove();
      void backend().removeChannel(channel);
    };
  }, [session?.user.id, role]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (destination.roomId) {
          setDestination({ tab: "chat" });
          return true;
        }
        if (destination.tab !== "home") {
          setDestination({ tab: "home" });
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [destination]);
  const logout = async () => {
    await disconnectPush();
    const { error } = await backend().auth.signOut({ scope: "local" });
    if (error) throw new Error("로그아웃하지 못했습니다. 다시 시도해주세요.");
    setPending(null);
    setPushStatus("기기 연결 해제됨");
  };
  if (loading) return <Loading />;
  if (!session) return <Login />;
  if (role === "checking") return <Loading />;
  if (role !== "teacher")
    return (
      <ScrollView contentContainerStyle={s.content}>
        <Card>
          <Heading>
            {role === "denied"
              ? "선생님 계정으로 로그인해주세요"
              : "계정 정보를 확인하지 못했습니다"}
          </Heading>
          <Body>
            이 첫 버전은 선생님용입니다. 학생 기능은 웹에서 이용할 수 있습니다.
          </Body>
          {role === "error" && (
            <Button
              title="다시 확인"
              onPress={() => setProfileRetry((value) => value + 1)}
            />
          )}
          <Button
            title="로그아웃"
            secondary
            onPress={() =>
              void logout().catch((error) =>
                Alert.alert("로그아웃", error.message),
              )
            }
          />
        </Card>
      </ScrollView>
    );
  const props = {
    userId: session.user.id,
    refreshKey: refresh,
    navigate,
    openWeb,
  };
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 12,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{ fontSize: 23, fontWeight: "900", color: colors.primary }}
        >
          고쌤 · 선생님
        </Text>
        <Note>{pushStatus}</Note>
      </View>
      <View style={{ flex: 1 }}>
        {destination.tab === "home" ? (
          <HomeScreen {...props} />
        ) : destination.tab === "notifications" ? (
          <NotificationsScreen {...props} />
        ) : destination.tab === "chat" ? (
          <ChatScreen
            userId={session.user.id}
            roomId={destination.roomId}
            onRoom={(roomId) => setDestination({ tab: "chat", roomId })}
            refreshKey={refresh}
          />
        ) : destination.tab === "bookings" ? (
          <BookingsScreen
            {...props}
            sessionId={destination.sessionId}
            path={destination.path}
          />
        ) : (
          <SettingsScreen
            userId={session.user.id}
            onLogout={logout}
            onPushStatus={setPushStatus}
          />
        )}
      </View>
      <View style={s.tabs}>
        {(
          [
            ["home", "홈"],
            ["notifications", "알림"],
            ["chat", "채팅"],
            ["bookings", "신청·수업"],
            ["settings", "설정"],
          ] as const
        ).map(([tab, label]) => (
          <Pressable
            key={tab}
            style={s.tab}
            accessibilityRole="button"
            accessibilityState={{ selected: destination.tab === tab }}
            onPress={() => setDestination({ tab })}
          >
            <Text
              style={[
                s.tabText,
                {
                  paddingVertical: 4,
                  color:
                    destination.tab === tab ? colors.primary : colors.muted,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  const login = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await backend().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch {
      setMessage(
        "로그인하지 못했습니다. 이메일·비밀번호와 이메일 인증 여부를 확인해주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        s.content,
        { flexGrow: 1, justifyContent: "center" },
      ]}
    >
      <Card>
        <Heading>고쌤 선생님 앱</Heading>
        <Body>웹에서 사용하는 선생님 계정으로 로그인하세요.</Body>
        <Input
          accessibilityLabel="이메일"
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          editable={!busy}
        />
        <Input
          accessibilityLabel="비밀번호"
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          editable={!busy}
        />
        {message && <Note error>{message}</Note>}
        <Button
          title={busy ? "로그인 중…" : "로그인"}
          disabled={busy || !email.trim() || !password}
          onPress={() => void login()}
        />
        <Note>
          초기 테스트 버전은 이메일·비밀번호 로그인을 지원합니다. Google로
          가입했다면 웹의 비밀번호 복구에서 비밀번호를 설정한 후 이용할 수
          있습니다.
        </Note>
        <Button
          title="비밀번호 재설정 · 웹"
          secondary
          onPress={() => {
            try {
              void Linking.openURL(
                trustedWebUrl("/forgot-password", webOrigin),
              );
            } catch {
              setMessage("웹 주소 연결 설정을 확인해주세요.");
            }
          }}
        />
      </Card>
    </ScrollView>
  );
}
