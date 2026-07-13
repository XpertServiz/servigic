import React from "react";
import { Text } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
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

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyOtp: { userId: string };
};

export type HomeStackParamList = {
  Home: undefined;
  PostJob: { categoryId?: string; urgency?: "EMERGENCY" | "TODAY" | "SCHEDULED" } | undefined;
  JobDetail: { jobId: string };
  BookingDetail: { bookingId: string };
};

export type JobsStackParamList = {
  MyJobs: undefined;
  JobDetail: { jobId: string };
  BookingDetail: { bookingId: string };
};

export type MessagesStackParamList = {
  Messages: undefined;
  MessageThread: { bookingId: string; otherPartyName: string };
};

export type AccountStackParamList = {
  Account: undefined;
};

// Kept for any lingering references — union of every screen across stacks.
export type RootStackParamList = HomeStackParamList & JobsStackParamList & MessagesStackParamList & AccountStackParamList;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
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
  headerStyle: { backgroundColor: colors.bgElevated },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="PostJob" component={PostJobScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Bids" }} />
      <HomeStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Booking" }} />
    </HomeStack.Navigator>
  );
}

function JobsStackNavigator() {
  return (
    <JobsStack.Navigator screenOptions={screenOptions}>
      <JobsStack.Screen name="MyJobs" component={MyJobsScreen} options={{ headerShown: false }} />
      <JobsStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Bids" }} />
      <JobsStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Booking" }} />
    </JobsStack.Navigator>
  );
}

function MessagesStackNavigator() {
  return (
    <MessagesStack.Navigator screenOptions={screenOptions}>
      <MessagesStack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: false }} />
      <MessagesStack.Screen
        name="MessageThread"
        component={MessageThreadScreen}
        options={({ route }) => ({ title: route.params.otherPartyName })}
      />
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

const TAB_ICONS: Record<string, string> = { HomeTab: "🏠", JobsTab: "📋", MessagesTab: "💬", AccountTab: "👤" };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border, height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: "Home" }} />
      <Tab.Screen name="JobsTab" component={JobsStackNavigator} options={{ title: "My Jobs" }} />
      <Tab.Screen name="MessagesTab" component={MessagesStackNavigator} options={{ title: "Messages" }} />
      <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: "Account" }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!user ? (
        <AuthStack.Navigator screenOptions={screenOptions}>
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Signup" component={SignupScreen} options={{ title: "Create Account" }} />
          <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: "Verify Phone" }} />
        </AuthStack.Navigator>
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
}
