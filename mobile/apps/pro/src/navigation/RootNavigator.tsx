import React from "react";
import { Text } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import * as api from "../lib/api";
import { SplashScreen } from "../screens/SplashScreen";
import KycOnboardingScreen from "../screens/KycOnboardingScreen";
import AwaitingApprovalScreen from "../screens/AwaitingApprovalScreen";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import VerifyOtpScreen from "../screens/VerifyOtpScreen";
import HomeScreen from "../screens/HomeScreen";
import JobsScreen from "../screens/JobsScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import BookingDetailScreen from "../screens/BookingDetailScreen";
import EarningsScreen from "../screens/EarningsScreen";
import ProfileScreen from "../screens/ProfileScreen";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyOtp: { userId: string };
};

export type HomeStackParamList = {
  Home: undefined;
};

export type JobsStackParamList = {
  Jobs: undefined;
  JobDetail: { jobId: string };
  BookingDetail: { bookingId: string };
};

export type EarningsStackParamList = {
  Earnings: undefined;
};

export type AccountStackParamList = {
  Account: undefined;
};

export type RootStackParamList = HomeStackParamList & JobsStackParamList & EarningsStackParamList & AccountStackParamList;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const JobsStack = createNativeStackNavigator<JobsStackParamList>();
const EarningsStack = createNativeStackNavigator<EarningsStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bgElevated, border: colors.border, primary: colors.accent, text: colors.text },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.bgElevated },
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
  return (
    <JobsStack.Navigator screenOptions={screenOptions}>
      <JobsStack.Screen name="Jobs" component={JobsScreen} options={{ headerShown: false }} />
      <JobsStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job" }} />
      <JobsStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Booking" }} />
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

const TAB_ICONS: Record<string, string> = { HomeTab: "🏠", JobsTab: "🧰", EarningsTab: "💰", AccountTab: "👤" };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border, height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: "Home" }} />
      <Tab.Screen name="JobsTab" component={JobsStackNavigator} options={{ title: "Jobs" }} />
      <Tab.Screen name="EarningsTab" component={EarningsStackNavigator} options={{ title: "Earnings" }} />
      <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: "Account" }} />
    </Tab.Navigator>
  );
}

type ProfileGate = "loading" | "needsDocs" | "pendingApproval" | "approved";

export function RootNavigator() {
  const { user, loading } = useAuth();
  const [gate, setGate] = React.useState<ProfileGate>("loading");

  const refreshGate = React.useCallback(async () => {
    if (!user) return;
    try {
      const { profile } = await api.getProviderProfile();
      const p = (profile ?? {}) as Record<string, unknown>;
      const hasDocs = Boolean(p.cnicUrl) && Boolean(p.selfieUrl);
      const verificationLevel = (p.verificationLevel as number) ?? 0;
      if (!hasDocs) setGate("needsDocs");
      else if (verificationLevel < 1) setGate("pendingApproval");
      else setGate("approved");
    } catch {
      // If the profile fetch fails, don't strand the user on a blank
      // screen — fall through to the normal app so they can at least retry
      // from Account, rather than a dead end with no way forward.
      setGate("approved");
    }
  }, [user]);

  React.useEffect(() => {
    if (user) refreshGate();
  }, [user, refreshGate]);

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      {!user ? (
        <AuthStack.Navigator screenOptions={screenOptions}>
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Signup" component={SignupScreen} options={{ title: "Become a Pro" }} />
          <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: "Verify Phone" }} />
        </AuthStack.Navigator>
      ) : gate === "loading" ? (
        <SplashScreen />
      ) : gate === "needsDocs" ? (
        <KycOnboardingScreen onSubmitted={refreshGate} />
      ) : gate === "pendingApproval" ? (
        <AwaitingApprovalScreen onRefresh={refreshGate} />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
}
