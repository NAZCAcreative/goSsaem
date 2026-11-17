export type Destination = {
  tab: "home" | "notifications" | "chat" | "bookings" | "settings";
  roomId?: string;
  sessionId?: string;
  path?: string;
};
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function notificationDestination(link: unknown): Destination {
  if (
    typeof link !== "string" ||
    !link.startsWith("/") ||
    link.startsWith("//") ||
    /[\\\r\n]/.test(link)
  )
    return { tab: "notifications" };
  const chat = new RegExp(`^/teacher/chat/(${uuid})$`, "i").exec(link);
  if (chat) return { tab: "chat", roomId: chat[1] };
  if (link === "/teacher/chat") return { tab: "chat" };
  if (link === "/teacher/lessons") return { tab: "bookings" };
  const attendance = new RegExp(
    `^/teacher/lessons/attendance\\?session=(${uuid})$`,
    "i",
  ).exec(link);
  if (attendance) return { tab: "bookings", sessionId: attendance[1] };
  if (new RegExp(`^/sessions/(${uuid})$`, "i").test(link))
    return { tab: "bookings", path: link };
  if (
    [
      "/teacher/profile/reviews",
      "/teacher/settlement",
      "/teacher/profile/withdraw",
      "/teacher/students",
    ].includes(link)
  )
    return { tab: "home", path: link };
  return { tab: "notifications" };
}
export function trustedWebUrl(path: string, origin: string) {
  const base = new URL(origin);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("HTTPS 웹 주소 설정이 필요합니다.");
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\r\n]/.test(path))
    throw new Error("올바르지 않은 이동 경로입니다.");
  const result = new URL(path, base);
  if (result.origin !== base.origin)
    throw new Error("허용되지 않은 주소입니다.");
  return result.toString();
}
