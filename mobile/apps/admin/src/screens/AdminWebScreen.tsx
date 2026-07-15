import React, { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, BackHandler } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { getApiBaseUrl } from "../lib/api";

// Deliberately not a native re-implementation of every admin page — the web
// admin panel already has every feature (Payments, Disputes, Payouts, Job
// Durations, Settings, ...); this screen just gets the admin logged into
// that real panel inside the app and adds a few one-tap shortcuts for the
// screens they need fastest (approving/rejecting a payment) so they never
// have to open a laptop for that.
const QUICK_LINKS: { label: string; path: string }[] = [
  { label: "Payments", path: "/admin/payments" },
  { label: "Disputes", path: "/admin/disputes" },
  { label: "Payouts", path: "/admin/payouts" },
  { label: "Dashboard", path: "/admin" },
];

function buildAutoLoginScript(phone: string, password: string): string {
  return `
    (function () {
      function setNativeValue(input, value) {
        var proto = window.HTMLInputElement.prototype;
        var desc = Object.getOwnPropertyDescriptor(proto, "value");
        desc.set.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      var phoneInput = document.querySelector('input[name="phone"]');
      var passInput = document.querySelector('input[name="password"]');
      if (phoneInput && passInput) {
        setNativeValue(phoneInput, ${JSON.stringify(phone)});
        setNativeValue(passInput, ${JSON.stringify(password)});
        var btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      }
      true;
    })();
  `;
}

export function AdminWebScreen({ initialPath = "/admin/payments" }: { initialPath?: string }) {
  const insets = useSafeAreaInsets();
  const { credentials, signOut } = useAuth();
  const webRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);
  const [loggingIn, setLoggingIn] = useState(true);
  // Guards against a retry loop injecting the login form repeatedly if it
  // ever fails (e.g. credentials changed server-side after this device's
  // last sign-in) — attempt auto-login exactly once per screen visit.
  const autoLoginAttempted = useRef(false);
  const baseUrl = getApiBaseUrl();
  const startUrl = `${baseUrl}/login?callbackUrl=${encodeURIComponent(initialPath)}`;

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (canGoBack) {
          webRef.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [canGoBack])
  );

  // Auto-login should resolve in a couple seconds; if it never does (e.g.
  // credentials rejected server-side), stop blocking the screen with a
  // spinner forever so the admin can at least see the real login page.
  React.useEffect(() => {
    const t = setTimeout(() => setLoggingIn(false), 8000);
    return () => clearTimeout(t);
  }, []);

  function onNavStateChange(nav: WebViewNavigation) {
    setCurrentUrl(nav.url);
    setCanGoBack(nav.canGoBack);
    if (nav.url.includes("/admin")) setLoggingIn(false);
  }

  function onLoadEnd() {
    if (currentUrl.includes("/login") && credentials && !autoLoginAttempted.current) {
      autoLoginAttempted.current = true;
      webRef.current?.injectJavaScript(buildAutoLoginScript(credentials.phone, credentials.password));
    }
  }

  function goTo(path: string) {
    webRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(path)}; true;`);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Servigic Admin</Text>
        <Pressable onPress={signOut} hitSlop={10}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: startUrl }}
        style={styles.webview}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        onNavigationStateChange={onNavStateChange}
        onLoadEnd={onLoadEnd}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}
      />

      {loggingIn && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Signing in…</Text>
        </View>
      )}

      <View style={[styles.quickNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {QUICK_LINKS.map((q) => (
          <Pressable key={q.path} onPress={() => goTo(q.path)} style={styles.quickNavItem}>
            <Text
              style={[styles.quickNavLabel, currentUrl.includes(q.path) && q.path !== "/admin" && styles.quickNavLabelActive]}
            >
              {q.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: "800", fontSize: 16 },
  signOut: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  webview: { flex: 1, backgroundColor: colors.bg },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: 10,
  },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  quickNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingTop: 10,
  },
  quickNavItem: { flex: 1, alignItems: "center", paddingVertical: 4 },
  quickNavLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  quickNavLabelActive: { color: colors.accent },
});
