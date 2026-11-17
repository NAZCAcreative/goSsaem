import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { backend, installationId, webOrigin } from "./backend";
import { trustedWebUrl } from "./navigation";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
export async function setupChannels() {
  if (Platform.OS !== "android") return;
  for (const [id, name] of [
    ["chat", "채팅"],
    ["bookings", "수업 신청·예약"],
    ["reminders", "수업 시작"],
    ["general", "고쌤 안내"],
  ])
    await Notifications.setNotificationChannelAsync(id, {
      name,
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 150, 250],
    });
}
let operation: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const next = operation.then(action, action);
  operation = next.catch(() => {});
  return next;
}
export function registerPush(ask = false) {
  return serialize(() => registerDevice(ask));
}
async function registerDevice(ask = false) {
  if (!ask && (await SecureStore.getItemAsync("gossaem.pushWanted")) !== "true")
    return false;
  if (!Device.isDevice)
    throw new Error("원격 푸시는 실제 안드로이드 기기에서 확인해주세요.");
  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId)
    throw new Error("Expo 프로젝트 연결 후 APK를 다시 빌드해주세요.");
  await setupChannels();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && ask)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    if (!ask) return false;
    throw new Error("휴대폰 설정에서 고쌤 알림을 허용해주세요.");
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await backend().rpc("register_mobile_push_device", {
    p_device: await installationId(),
    p_token: token,
    p_project: projectId,
    p_platform: Platform.OS === "ios" ? "ios" : "android",
    p_version:
      Application.nativeApplicationVersion ||
      Constants.expoConfig?.version ||
      "0.1.0",
  });
  if (error)
    throw new Error(
      "기기를 등록하지 못했습니다. 서버 DB 적용 상태와 계정 연결을 확인해주세요.",
    );
  await SecureStore.setItemAsync("gossaem.pushWanted", "true");
  return true;
}
export function disconnectPush() {
  return serialize(disconnectDevice);
}
async function disconnectDevice() {
  const wanted = await SecureStore.getItemAsync("gossaem.pushWanted");
  const { error } = await backend().rpc("unregister_mobile_push_device", {
    p_device: await installationId(),
  });
  if (error && (wanted === "true" || error.code !== "PGRST202"))
    throw new Error(
      "기기 알림 연결을 해제하지 못했습니다. 네트워크 연결 후 다시 시도해주세요.",
    );
  await SecureStore.setItemAsync("gossaem.pushWanted", "false");
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.clearLastNotificationResponseAsync();
}
export async function localPushTest() {
  await setupChannels();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("알림 수신을 허용해주세요.");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "고쌤 로컬 알림 테스트",
      body: "휴대폰 알림 표시 테스트입니다. 원격 푸시 테스트와는 별개입니다.",
      data: { localTest: true, linkUrl: "/teacher/home" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: "general",
    },
  });
}
export async function remotePushTest(kind: "chat_message" | "booking_status") {
  const {
    data: { session },
  } = await backend().auth.getSession();
  if (!session) throw new Error("다시 로그인해주세요.");
  const response = await fetch(
    trustedWebUrl("/api/mobile/push-test", webOrigin),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceId: await installationId(), kind }),
      signal: AbortSignal.timeout(30000),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "테스트 푸시를 요청하지 못했습니다.");
  if (result.accepted > 0)
    return "Expo에 발송 접수했습니다. 앱을 백그라운드로 전환해 수신을 확인해주세요.";
  if (result.uncertain > 0)
    throw new Error(
      "발송 결과가 불확실합니다. 중복 방지를 위해 자동 재발송하지 않습니다.",
    );
  if (result.failed > 0)
    throw new Error(
      "발송에 실패했습니다. Expo·Firebase 인증 설정을 확인해주세요.",
    );
  return "알림함에 기록했습니다. 알림별 수신 설정·조용한 시간·웹의 채팅 알림 설정을 확인해주세요.";
}
