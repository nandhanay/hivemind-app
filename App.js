import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useFonts, Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { UserProvider, useUser } from './src/context/UserContext';
import LoadingSpinner from './src/components/LoadingSpinner';
import ToastMessage from './src/components/ToastMessage';
import FloatingBeeAssistant from './src/components/FloatingBeeAssistant';
import { navigationRef } from './src/navigation/RootNavigation';

// ---------------------------------------------------------------------------
// Startup logging — these run at import time to trace init order in logcat
// ---------------------------------------------------------------------------
console.log('[HiveMind] ====== APP STARTUP ======');
console.log('[HiveMind] App.js module loaded');

// Log env-var availability (values are NOT logged for security)
const ENV_KEYS = [
  'EXPO_PUBLIC_GROQ_API_KEY',
  'EXPO_PUBLIC_GEMINI_API_KEY',
  'EXPO_PUBLIC_GROQ_CHAT_MODEL',
  'EXPO_PUBLIC_GROQ_LEARNING_MODEL',
  'EXPO_PUBLIC_GROQ_VISION_MODEL',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
];
ENV_KEYS.forEach((key) => {
  const val = process.env[key];
  console.log(`[HiveMind] ENV ${key}: ${val ? '✅ SET' : '❌ MISSING'}`);
});

// ---------------------------------------------------------------------------
// Error Boundary — prevents white-screen-of-death crashes
// ---------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[HiveMind] ❌ UNCAUGHT RENDER ERROR:', error);
    console.error('[HiveMind] Component stack:', errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', padding: 24 }}>
          <ScrollView>
            <Text style={{ color: '#FF6B6B', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
              HiveMind Crash Report
            </Text>
            <Text style={{ color: '#FFAA00', fontSize: 14, marginBottom: 16 }}>
              The app encountered an error during startup. This is often caused by missing environment variables in the EAS build.
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 16 }}>
              {this.state.error?.toString() || 'Unknown error'}
            </Text>
            <Text style={{ color: '#888', fontSize: 12 }}>
              Check that all EXPO_PUBLIC_* environment variables are set in your EAS secrets (eas env:create).
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

import AuthLandingScreen from './src/screens/AuthLandingScreen';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import FocusTimerScreen from './src/screens/FocusTimerScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import NotesScreen from './src/screens/NotesScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import NoteViewScreen from './src/screens/NoteViewScreen';
import AINotesGeneratorScreen from './src/screens/AINotesGeneratorScreen';
import FlashcardScreen from './src/screens/FlashcardScreen';
import FlashcardStudyScreen from './src/screens/FlashcardStudyScreen';
import FlashcardEditorScreen from './src/screens/FlashcardEditorScreen';
import AIFlashcardScreen from './src/screens/AIFlashcardScreen';
import QuizScreen from './src/screens/QuizScreen';
import QuizSetupScreen from './src/screens/QuizSetupScreen';
import QuizTakingScreen from './src/screens/QuizTakingScreen';
import QuizResultScreen from './src/screens/QuizResultScreen';
import WeakTopicsScreen from './src/screens/WeakTopicsScreen';
import WeakTopicDetailScreen from './src/screens/WeakTopicDetailScreen';
import StudyRoomsScreen from './src/screens/StudyRoomsScreen';
import StudyRoomDetailScreen from './src/screens/StudyRoomDetailScreen';
import CreateRoomScreen from './src/screens/CreateRoomScreen';
import JoinRoomScreen from './src/screens/JoinRoomScreen';
import WorkspaceScreen from './src/screens/WorkspaceScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Focus') {
            iconName = focused ? 'timer' : 'timer-outline';
          } else if (route.name === 'Planner') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Library') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          paddingBottom: 5,
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Focus" component={FocusTimerScreen} />
      <Tab.Screen name="Planner" component={PlannerScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { colors, isDarkMode } = useTheme();
  const { isLoggedIn, isGuest, authInitializing } = useUser();

  const canAccessApp = isLoggedIn || isGuest;

  const navTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  if (authInitializing) {
    return <LoadingSpinner message="Restoring your session..." colors={colors} />;
  }

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'card',
          contentStyle: { flex: 1, backgroundColor: colors.background },
        }}
      >
        {!canAccessApp ? (
          <>
            <Stack.Screen name="AuthLanding" component={AuthLandingScreen} />
            <Stack.Screen name="AuthScreen" component={AuthScreen} />
          </>
        ) : (
          <>

            <Stack.Screen name="MainTabs" component={MainTabs} />

            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.primary,
                headerBackTitle: 'Back',
                headerBackVisible: true,
              }}
            />

            <Stack.Screen name="Notes" component={NotesScreen} />
            <Stack.Screen
              name="NoteEditor"
              component={NoteEditorScreen}
              options={{
                presentation: 'card',
                animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
                contentStyle: { flex: 1, backgroundColor: colors.background },
              }}
            />
            <Stack.Screen name="NoteView" component={NoteViewScreen} />
            <Stack.Screen name="AINotesGenerator" component={AINotesGeneratorScreen} />
            <Stack.Screen name="Flashcards" component={FlashcardScreen} />
            <Stack.Screen name="FlashcardStudy" component={FlashcardStudyScreen} />
            <Stack.Screen name="FlashcardEditor" component={FlashcardEditorScreen} />
            <Stack.Screen name="AIFlashcard" component={AIFlashcardScreen} />
            <Stack.Screen name="Quiz" component={QuizScreen} />
            <Stack.Screen name="QuizSetup" component={QuizSetupScreen} />
            <Stack.Screen name="QuizTaking" component={QuizTakingScreen} />
            <Stack.Screen name="QuizResult" component={QuizResultScreen} />
            <Stack.Screen name="WeakTopics" component={WeakTopicsScreen} />
            <Stack.Screen name="WeakTopicDetail" component={WeakTopicDetailScreen} />
            <Stack.Screen name="Workspace" component={WorkspaceScreen} />
            <Stack.Screen name="StudyRooms" component={StudyRoomsScreen} />
            <Stack.Screen name="StudyRoomDetail" component={StudyRoomDetailScreen} />
            <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
            <Stack.Screen name="JoinRoom" component={JoinRoomScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppShell() {
  const { message, clearMessage } = useUser();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <AppNavigator />
      <ToastMessage message={message} onHide={clearMessage} />
      <FloatingBeeAssistant />
    </View>
  );
}

export default function App() {
  console.log('[HiveMind] App() component rendering');

  const [fontsLoaded] = useFonts({
    'Handwritten': Caveat_400Regular,
    'Handwritten-Bold': Caveat_700Bold,
  });

  if (!fontsLoaded) {
    console.log('[HiveMind] Fonts loading...');
    return <View style={{ flex: 1, backgroundColor: '#121212' }} />;
  }

  console.log('[HiveMind] ✅ Fonts loaded, rendering app tree');

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <UserProvider>
            <AppShell />
          </UserProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}