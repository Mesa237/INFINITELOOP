import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { makeStyles, useCoucouTheme } from '../theme/coucou';

export default function AuthScreen() {
  const { C } = useCoucouTheme();
  const styles = useStyles();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const isSignUp = mode === 'signup';

  async function submit() {
    setMessage('');
    setIsError(false);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      setIsError(true);
      setMessage('Enter your email and password to continue.');
      return;
    }
    if (isSignUp && !name.trim()) {
      setIsError(true);
      setMessage('Add your name so neighbours know what to call you.');
      return;
    }
    if (isSignUp && password.length < 6) {
      setIsError(true);
      setMessage('Choose a password with at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Account created. Check your email to confirm it, then sign in.');
          setMode('signin');
          setPassword('');
        } else {
          setMessage('Your account is ready. Welcome to the neighbourhood!');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Could not connect. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage('');
    setIsError(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandRow}>
            <View style={styles.sun}><Text style={styles.sunGlyph}>☀</Text></View>
            <Text style={styles.brand}>CouCou<Text style={styles.brandAccent}>Montreal</Text></Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.kicker}>A NEIGHBOURHOOD THAT SAYS HELLO</Text>
            <Text style={styles.title}>
              {isSignUp ? 'Find your people.' : 'A little help goes a long way.'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Meet neighbours, share what you know, and feel at home in Montréal.'
                : 'Connect with neighbours for everyday help, language practice, and new friendships.'}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.switcher}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !isSignUp }}
                onPress={() => changeMode('signin')}
                style={[styles.switchOption, !isSignUp && styles.switchSelected]}
              >
                <Text style={[styles.switchText, !isSignUp && styles.switchTextSelected]}>Sign in</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSignUp }}
                onPress={() => changeMode('signup')}
                style={[styles.switchOption, isSignUp && styles.switchSelected]}
              >
                <Text style={[styles.switchText, isSignUp && styles.switchTextSelected]}>Create account</Text>
              </Pressable>
            </View>

            {isSignUp && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Your name</Text>
                <TextInput
                  accessibilityLabel="Your name"
                  autoCapitalize="words"
                  autoComplete="name"
                  onChangeText={setName}
                  placeholder="How neighbours will know you"
                  placeholderTextColor={C.placeholder}
                  returnKeyType="next"
                  style={styles.input}
                  value={name}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={C.placeholder}
                returnKeyType="next"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                placeholderTextColor={C.placeholder}
                returnKeyType="go"
                secureTextEntry
                style={styles.input}
                textContentType={isSignUp ? 'newPassword' : 'password'}
                value={password}
              />
            </View>

            {!!message && (
              <Text accessibilityLiveRegion="polite" style={[styles.message, isError ? styles.error : styles.success]}>
                {message}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={submit}
              style={({ pressed }) => [styles.submit, (pressed || busy) && styles.dimmed]}
            >
              {busy ? (
                <ActivityIndicator color={C.onAccent} />
              ) : (
                <Text style={styles.submitText}>{isSignUp ? 'Join the neighbourhood' : 'Sign in'}</Text>
              )}
            </Pressable>

            <Text style={styles.privacy}>
              Your account helps keep the community welcoming and accountable.
            </Text>
          </View>

          <Text style={styles.footer}>Montréal is better when we help each other.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((C) => ({
  safe: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28, width: '100%', maxWidth: 600, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  sun: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' },
  sunGlyph: { color: C.onAccent, fontSize: 22 },
  brand: { color: C.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  brandAccent: { fontWeight: '500' },
  intro: { marginBottom: 25 },
  kicker: { color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  title: { color: C.text, fontSize: 34, fontWeight: '800', lineHeight: 39, letterSpacing: -1, maxWidth: 430 },
  subtitle: { color: C.muted, fontSize: 16, lineHeight: 24, marginTop: 12, maxWidth: 450 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 22, padding: 20, shadowColor: C.shadow, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  switcher: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: C.track, marginBottom: 22 },
  switchOption: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 11, paddingHorizontal: 8 },
  switchSelected: { backgroundColor: C.yellow },
  switchText: { color: C.muted, fontSize: 14, fontWeight: '700' },
  switchTextSelected: { color: C.onAccent },
  fieldGroup: { marginBottom: 16 },
  label: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { width: '100%', minHeight: 50, borderWidth: 1, borderColor: C.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, backgroundColor: C.inputBg, fontSize: 15 },
  message: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  error: { color: C.error },
  success: { color: C.success },
  submit: { minHeight: 52, borderRadius: 14, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 2 },
  submitText: { color: C.onAccent, fontSize: 15, fontWeight: '800' },
  dimmed: { opacity: 0.6 },
  privacy: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16 },
  footer: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 22 },
}));
