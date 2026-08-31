import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FileText, Layers, Network, Settings } from 'lucide-react-native';

import { colors, typography } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

import { AuthScreen } from '../screens/AuthScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';
import { FlashcardsScreen } from '../screens/FlashcardsScreen';
import { FlashcardStudyScreen } from '../screens/FlashcardStudyScreen';
import { GraphScreen } from '../screens/GraphScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const synapNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.foreground,
    border: colors.border,
    primary: colors.foreground,
  },
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.foregroundMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: typography.fontFamily.sans,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="NotesTab"
        component={NotesScreen}
        options={{
          tabBarLabel: 'Notas',
          tabBarIcon: ({ color, size }) => (
            <FileText size={size - 2} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="FlashcardsTab"
        component={FlashcardsScreen}
        options={{
          tabBarLabel: 'Flashcards',
          tabBarIcon: ({ color, size }) => (
            <Layers size={size - 2} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="GraphTab"
        component={GraphScreen}
        options={{
          tabBarLabel: 'Grafo',
          tabBarIcon: ({ color, size }) => (
            <Network size={size - 2} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size - 2} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={synapNavTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
              name="NoteEditor"
              component={NoteEditorScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="FlashcardStudy"
              component={FlashcardStudyScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
