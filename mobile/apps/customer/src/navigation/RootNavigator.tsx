import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../lib/auth";
import * as api from "../lib/api";
import { sound } from "../lib/sound";
import { haptic } from "../components/ds";
import { colors } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { navigationRef } from "./ref";
import { AppTabBar } from "../components/TabBar";
import { LanguageSuggestion } from "../components/LanguageSuggestion";
import { CHANNELS } from "../lib/notifications";
import { SplashScreen } from "../screens/SplashScreen";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import VerifyOtpScreen from "../screens/VerifyOtpScreen";
import HomeScreen from "../screens/HomeScreen";
import MyJobsScreen from "../screens/MyJobsScreen";
import MessagesScreen from "../screens/MessagesScreen";
import MessageThreadScreen from "../screens/MessageThreadScreen";
import PostJobScreen from "../screens/PostJobScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import BookingDetailScreen from "../screens/BookingDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LanguageScreen from "../screens/LanguageScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyOtp: { userId: string };
  Language: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  PostJob: { categoryId?: string; urgency?: "EMERGENCY" | "TODAY" | "SCHEDULED" } | undefined;
  JobDetail: { jobId: string };
  BookingDetail: { bookingId: string };
  MessageThread: { bookingId: string; otherPartyName: string };
};

export type JobsStackParamList = {
  MyJobs: undefined;
  JobDetail: { jobId: string };
  BookingDetail: { bookingId: string };
  MessageThread: { bookingId: string; otherPartyName: string };
};

export type MessagesStackParamList = {
  Messages: undefined;
  MessageThread: { bookingId: string; otherPartyName: string };
};

export type AccountStackParamList = {
  Account: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Language: undefined;
  Notifications: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const JobsStack = createNativeStackNavigator<JobsStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();
const Tab = createBottomTabNavigator();

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
  const { t } = useI18n();
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="PostJob" component={PostJobScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: t("nav.bids") }} />
      <HomeStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="MessageThread" component={MessageThreadScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

function JobsStackNavigator() {
  const { t } = useI18n();
  return (
    <JobsStack.Navigator screenOptions={screenOptions}>
      <JobsStack.Screen name="MyJobs" component={MyJobsScreen} options={{ headerShown: false }} />
      <JobsStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: t("nav.bids") }} />
      <JobsStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: false }} />
      <JobsStack.Screen name="MessageThread" component={MessageThreadScreen} options={{ headerShown: false }} />
    </JobsStack.Navigator>
  );
}

function MessagesStackNavigator() {
  return (
    <MessagesStack.Navigator screenOptions={screenOptions}>
      <MessagesStack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: false }} />
      <MessagesStack.Screen name="MessageThread" component={MessageThreadScreen} options={{ headerShown: false }} />
    </MessagesStack.Navigator>
  );
}

function AccountStackNavigator() {
  return (
    <AccountStack.Navigator screenOptions={screenOptions}>
      <AccountStack.Screen name="Account" component={ProfileScreen} options={{ headerShown: false }} />
    </AccountStack.Navigator>
  );
}

const TAB_ICONS = { HomeTab: "home", JobsTab: "clipboard", MessagesTab: "chat", AccountTab: "account" } as const;
const BID_POLL_MS = 15000;

function MainTabs() {
  const { t } = useI18n();
  const lastBidCount = useRef<number | null>(null);

  // App-wide "new bid" watcher — fires regardless of which tab is open, so
  // the customer hears/feels it even if they're not sitting on a job's bid
  // board. Tracks the total bid count across open jobs rather than diffing
  // per-job, since that's all a single cheap poll of getMyJobs() gives us.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const { jobs } = await api.getMyJobs();
        if (cancelled) return;
        const total = jobs.filter((j) => j.status === "OPEN").reduce((sum, j) => sum + j._count.bids, 0);
        if (lastBidCount.current !== null && total > lastBidCount.current) {
          sound.statusChanged();
          haptic.success();
          Notifications.scheduleNotificationAsync({
            content: { title: t("push.newBidTitle"), body: t("push.newBidBody"), sound: "job_status_update.wav" },
            trigger: Platform.OS === "android" ? { channelId: CHANNELS.status } : null,
          }).catch(() => {});
        }
        lastBidCount.current = total;
      } catch {
        // Best-effort background poll — JobDetailScreen's own fetch surfaces real errors.
      }
    }
    poll();
    const interval = setInterval(poll, BID_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tab.Navigator tabBar={(props) => <AppTabBar {...props} icons={TAB_ICONS} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: t("tab.home") }} />
      <Tab.Screen name="JobsTab" component={JobsStackNavigator} options={{ title: t("tab.myJobs") }} />
      <Tab.Screen name="MessagesTab" component={MessagesStackNavigator} options={{ title: t("tab.messages") }} />
      <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: t("tab.account") }} />
    </Tab.Navigator>
  );
}

function MainRoot() {
  return (
    <RootStack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <RootStack.Screen name="Main" component={MainTabs} />
      <RootStack.Screen name="Language" component={LanguageScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: "modal" }} />
    </RootStack.Navigator>
  );
}

export function RootNavigator() {
  const { t } = useI18n();
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

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
        ) : (
          <MainRoot />
        )}
      </NavigationContainer>
      <LanguageSuggestion />
    </>
  );
}
