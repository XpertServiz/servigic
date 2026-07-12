import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import VerifyOtpScreen from "../screens/VerifyOtpScreen";
import DashboardScreen from "../screens/DashboardScreen";
import JobFeedScreen from "../screens/JobFeedScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import BookingsScreen from "../screens/BookingsScreen";
import BookingDetailScreen from "../screens/BookingDetailScreen";
import EarningsScreen from "../screens/EarningsScreen";
import ProfileScreen from "../screens/ProfileScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyOtp: { userId: string };
  Dashboard: undefined;
  JobFeed: undefined;
  JobDetail: { jobId: string };
  Bookings: undefined;
  BookingDetail: { bookingId: string };
  Earnings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Become a Pro" }} />
            <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: "Verify Phone" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Dashboard" }} />
            <Stack.Screen name="JobFeed" component={JobFeedScreen} options={{ title: "Job Feed" }} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job" }} />
            <Stack.Screen name="Bookings" component={BookingsScreen} options={{ title: "Bookings" }} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Booking" }} />
            <Stack.Screen name="Earnings" component={EarningsScreen} options={{ title: "Earnings" }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
