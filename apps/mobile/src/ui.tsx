import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
export const colors = {
  primary: "#6d28d9",
  background: "#f5f3ff",
  ink: "#172033",
  muted: "#64748b",
  border: "#e2e8f0",
};
export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Heading({ children }: { children: ReactNode }) {
  return <Text style={s.heading}>{children}</Text>;
}
export function Body({ children }: { children: ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}
export function Note({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      style={[s.note, error && { color: "#b91c1c" }]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && { backgroundColor: "#ede9fe" },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text
        style={{
          fontWeight: "700",
          color: secondary ? colors.primary : "white",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#94a3b8"
      {...props}
      style={[s.input, props.style]}
    />
  );
}
export function Loading() {
  return <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />;
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, gap: 16, paddingBottom: 32 },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  heading: { fontSize: 20, fontWeight: "800", color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink },
  note: { fontSize: 12, lineHeight: 19, color: colors.muted },
  button: {
    minHeight: 48,
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: "white",
  },
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "white",
  },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center" },
  tabText: { fontSize: 12, fontWeight: "700", color: colors.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
