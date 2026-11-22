import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AuthScreen from '@/screens/auth';
import { useCoucouTheme } from '@/theme/coucou';
import { supabase } from '../../lib/supabase';
import { getActivePortal, validatePortalAccess } from '../../lib/portal';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const { C, scheme } = useCoucouTheme();
  const [session, setSession] = useState<Session | null>(null);
  // Start false on SSR (web); true only after client mounts so SSR output matches
  const [mounted, setMounted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Mark client as mounted — this runs only on the client, never during SSR.
    // Setting mounted=true triggers a second render that is consistent because
    // the server always rendered the same blank placeholder below.
    setMounted(true);

    let alive = true;

    async function handleSessionValidation(candidateSession: Session | null) {
      if (!candidateSession?.user) {
        if (alive) {
          setSession(null);
          setCheckingSession(false);
        }
        return;
      }

      const activePortal = getActivePortal();
      const validation = await validatePortalAccess(candidateSession.user.id, activePortal);

      if (!validation.allowed) {
        await supabase.auth.signOut();
        if (alive) {
          setSession(null);
          setAuthError(validation.errorMessage || 'Access denied for this portal.');
          setCheckingSession(false);
        }
        return;
      }

      if (alive) {
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
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  // During SSR (and the very first client paint), render a neutral blank view.
  // This guarantees the server HTML matches the first client render, eliminating
  // the hydration mismatch from ActivityIndicator's dynamic SVG attributes.
  if (!mounted) {
    return (
      <ThemeProvider value={DefaultTheme}>
        <View style={styles.blank} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {checkingSession ? (
        <View style={[styles.loading, { backgroundColor: C.page }]} />
      ) : session ? (
        <Slot />
      ) : (
        <AuthScreen initialError={authError} onClearError={() => setAuthError(null)} />
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1 },
  loading: { flex: 1 },
});
