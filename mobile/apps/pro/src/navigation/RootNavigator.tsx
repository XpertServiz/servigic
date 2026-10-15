import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import * as api from "../lib/api";
import { useI18n } from "../lib/i18n";
import { navigationRef, navigateRoot } from "./ref";
import { AppTabBar } from "../components/TabBar";
import { LanguageSuggestion } from "../components/LanguageSuggestion";
import { SplashScreen } from "../screens/SplashScreen";
import KycOnboardingScreen from "../screens/KycOnboardingScreen";
import IncomingJobRing, { type IncomingJob } from "../screens/IncomingJobRing";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import VerifyOtpScreen from "../screens/VerifyOtpScreen";
import HomeScreen from "../screens/HomeScreen";
import JobsScreen from "../screens/JobsScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import BookingDetailScreen from "../screens/BookingDetailScreen";
import MessageThreadScreen from "../screens/MessageThreadScreen";
import EarningsScreen from "../screens/EarningsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LanguageScreen from "../screens/LanguageScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import BidAcceptedScreen from "../screens/BidAcceptedScreen";
import NeverMissJobScreen, { hasSeenNeverMiss } from "../screens/NeverMissJobScreen";
import { useNotificationTaps } from "../lib/notificationNav";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyOtp: { userId: string };
  Language: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
};

export type JobsStackParamList = {
  Jobs: undefined;
  JobDetail: { jobId: string; goOnline?: boolean };
  BookingDetail: { bookingId: string };
  MessageThread: { bookingId: string; otherPartyName: string };
};

export type EarningsStackParamList = {
  Earnings: undefined;
};

export type AccountStackParamList = {
  Account: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  BidAccepted: { bookingId: string };
  Language: undefined;
  Notifications: undefined;
  NeverMiss: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const JobsStack = createNativeStackNavigator<JobsStackParamList>();
const EarningsStack = createNativeStackNavigator<EarningsStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();
const Tab = createBottomTabNavigator();
const JOB_POLL_MS = 15000;

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bgElevated, border: colors.border, primary: colors.accent, text: colors.text },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

function JobsStackNavigator() {
  const { t } = useI18n();
  return (
    <JobsStack.Navigator screenOptions={screenOptions}>
      <JobsStack.Screen name="Jobs" component={JobsScreen} options={{ headerShown: false }} />
      <JobsStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: t("nav.job") }} />
      <JobsStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: t("nav.booking") }} />
      <JobsStack.Screen name="MessageThread" component={MessageThreadScreen} options={{ headerShown: false }} />
    </JobsStack.Navigator>
  );
}

function EarningsStackNavigator() {
  return (
    <EarningsStack.Navigator screenOptions={screenOptions}>
      <EarningsStack.Screen name="Earnings" component={EarningsScreen} options={{ headerShown: false }} />
    </EarningsStack.Navigator>
  );
}

function AccountStackNavigator() {
  return (
    <AccountStack.Navigator screenOptions={screenOptions}>
      <AccountStack.Screen name="Account" component={ProfileScreen} options={{ headerShown: false }} />
    </AccountStack.Navigator>
  );
}

const TAB_ICONS = { HomeTab: "home", JobsTab: "jobs", EarningsTab: "earnings", AccountTab: "account" } as const;

function MainTabs() {
  const { t } = useI18n();
  const [incomingJob, setIncomingJob] = useState<IncomingJob | null>(null);
  const seenJobIds = useRef<Set<string>>(new Set());
  const seenBookingIds = useRef<Set<string> | null>(null);
  const seeded = useRef(false);

  // App-wide watcher — deliberately independent of which tab is focused, so a
  // new-job ring or a "bid accepted" celebration can appear from any tab.
  // A locked-screen full-screen-intent ring needs native code plus a Play
  // Console declaration (see mobile/README.md); this is the foreground version.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const [{ jobs, isOnline }, { bookings }] = await Promise.all([api.getProviderJobFeed(), api.getMyBookings()]);
        if (cancelled) return;

        if (!seeded.current) {
          jobs.forEach((j) => seenJobIds.current.add(j.id));
          seenBookingIds.current = new Set(bookings.map((b) => b.id));
          seeded.current = true;
          return;
        }

        if (isOnline) {
          const fresh = jobs.find((j) => !seenJobIds.current.has(j.id));
          if (fresh) setIncomingJob(fresh);
        }
        jobs.forEach((j) => seenJobIds.current.add(j.id));

        // A booking we've never seen = a customer just accepted one of our bids.
        const known = seenBookingIds.current ?? new Set<string>();
        const won = bookings.find((b) => !known.has(b.id) && (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT"));
        bookings.forEach((b) => known.add(b.id));
        seenBookingIds.current = known;
        if (won) navigateRoot("BidAccepted", { bookingId: won.id });
      } catch {
        // Best-effort background poll — screens surface real errors themselves.
      }
    }
    poll();
    const interval = setInterval(poll, JOB_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <AppTabBar {...props} icons={TAB_ICONS} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: t("tab.home") }} />
        <Tab.Screen name="JobsTab" component={JobsStackNavigator} options={{ title: t("tab.jobs") }} />
        <Tab.Screen name="EarningsTab" component={EarningsStackNavigator} options={{ title: t("tab.earnings") }} />
        <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: t("tab.account") }} />
      </Tab.Navigator>

      {incomingJob && (
        <IncomingJobRing
          job={incomingJob}
          onView={() => {
            const jobId = incomingJob.id;
            setIncomingJob(null);
            navigateRoot("Main", { screen: "JobsTab", params: { screen: "JobDetail", params: { jobId } } });
          }}
          onDismiss={() => setIncomingJob(null)}
        />
      )}
    </View>
  );
}

function MainRoot() {
  useNotificationTaps(true);
  // First time in the app after approval: walk the pro through notification + battery settings once.
  useEffect(() => {
    let alive = true;
    hasSeenNeverMiss().then((seen) => {
      if (alive && !seen) setTimeout(() => navigateRoot("NeverMiss"), 1200);
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <RootStack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <RootStack.Screen name="Main" component={MainTabs} />
      <RootStack.Screen name="BidAccepted" component={BidAcceptedScreen} options={{ animation: "fade", gestureEnabled: false }} />
      <RootStack.Screen name="Language" component={LanguageScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="NeverMiss" component={NeverMissJobScreen} options={{ presentation: "modal" }} />
    </RootStack.Navigator>
  );
}

type ProfileGate = "loading" | "needsDocs" | "approved";

export function RootNavigator() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [gate, setGate] = React.useState<ProfileGate>("loading");
  const [rejectedReason, setRejectedReason] = React.useState<string | null>(null);

  const refreshGate = React.useCallback(async () => {
    if (!user) return;
    try {
      const { profile } = await api.getProviderProfile();
      const p = (profile ?? {}) as Record<string, unknown>;
      const hasDocs = Boolean(p.cnicUrl) && Boolean(p.selfieUrl);
      // A rejection stands until the pro uploads new documents (which stamps a newer submission).
      const rejectedAt = p.verificationRejectedAt ? new Date(p.verificationRejectedAt as string).getTime() : 0;
      const submittedAt = p.verificationSubmittedAt ? new Date(p.verificationSubmittedAt as string).getTime() : 0;
      const rejected = rejectedAt > 0 && submittedAt <= rejectedAt;
      setRejectedReason(rejected ? ((p.verificationRejectedReason as string | null) ?? t("verify.rejectedFallback")) : null);
      // Documents in but not yet approved: the pro can already browse and build their
      // profile - bidding stays locked until a person has checked the documents.
      setGate(!hasDocs || rejected ? "needsDocs" : "approved");
    } catch {
      // If the profile fetch fails, don't strand the user on a blank
      // screen — fall through to the normal app so they can at least retry
      // from Account, rather than a dead end with no way forward.
      setGate("approved");
    }
  }, [user, t]);

  React.useEffect(() => {
    if (user) refreshGate();
  }, [user, refreshGate]);

  if (loading) return <SplashScreen />;

  return (
    <>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {!user ? (
          <AuthStack.Navigator screenOptions={screenOptions}>
            <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <AuthStack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
            <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: t("nav.verifyPhone") }} />
            <AuthStack.Screen name="Language" component={LanguageScreen} options={{ presentation: "modal", headerShown: false }} />
          </AuthStack.Navigator>
        ) : gate === "loading" ? (
          <SplashScreen />
        ) : gate === "needsDocs" ? (
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Main">{() => <KycOnboardingScreen onSubmitted={refreshGate} rejectedReason={rejectedReason} />}</RootStack.Screen>
            <RootStack.Screen name="Language" component={LanguageScreen} options={{ presentation: "modal" }} />
          </RootStack.Navigator>
        ) : (
          <MainRoot />
        )}
      </NavigationContainer>
      <LanguageSuggestion />
    </>
  );
}
