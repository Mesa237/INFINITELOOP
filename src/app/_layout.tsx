import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import AuthScreen from '@/screens/auth';
import { supabase } from '../../lib/supabase';
import { getActivePortal, validatePortalAccess } from '../../lib/portal';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function handleSessionValidation(candidateSession: Session | null) {
      if (!candidateSession?.user) {
        if (mounted) {
          setSession(null);
          setCheckingSession(false);
        }
        return;
      }

      const activePortal = getActivePortal();
      const validation = await validatePortalAccess(candidateSession.user.id, activePortal);

      if (!validation.allowed) {
        // Enforce access control: disallow entry and sign out immediately
        await supabase.auth.signOut();
        if (mounted) {
          setSession(null);
          setAuthError(validation.errorMessage || 'Access denied for this portal.');
          setCheckingSession(false);
        }
        return;
      }

      if (mounted) {
        setAuthError(null);
        setSession(candidateSession);
        setCheckingSession(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      handleSessionValidation(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      handleSessionValidation(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {checkingSession ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#20211C" />
        </View>
      ) : session ? (
        <AppTabs />
      ) : (
        <AuthScreen initialError={authError} onClearError={() => setAuthError(null)} />
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF4' },
});
