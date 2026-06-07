import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { useFonts, Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { UserProvider, useUser } from './src/context/UserContext';
import LoadingSpinner from './src/components/LoadingSpinner';
import ToastMessage from './src/components/ToastMessage';
import FloatingBeeAssistant from './src/components/FloatingBeeAssistant';
import { navigationRef } from './src/navigation/RootNavigation';


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
  const [fontsLoaded] = useFonts({
    'Handwritten': Caveat_400Regular,
    'Handwritten-Bold': Caveat_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#121212' }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserProvider>
          <AppShell />
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}