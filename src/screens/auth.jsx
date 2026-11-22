import { Image } from "react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getActivePortal,
  setActivePortal,
  validatePortalAccess,
} from "../../lib/portal";
import { supabase } from "../../lib/supabase";

const palette = {
  ink: "#20211C",
  yellow: "#FFDF46",
  cream: "#FFFDF4",
  white: "#FFFFFF",
  muted: "#68695F",
  border: "#E7E4D7",
  error: "#A43C32",
  success: "#37694A",
  lilac: "#D8C2F4",
  highlight: "#FFF8D9",
  freeBadgeBg: "#E9F5EC",
  freeBadgeText: "#236C38",
};

export default function AuthScreen({ initialError, onClearError }) {
  const [accountType, setAccountType] = useState(() => getActivePortal()); // 'member' | 'volunteer' | 'both'
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialError || "");
  const [isError, setIsError] = useState(Boolean(initialError));

  useEffect(() => {
    if (initialError) {
      setMessage(initialError);
      setIsError(true);
    }
  }, [initialError]);

  const isSignUp = mode === "signup";
  const isVolunteer = accountType === "volunteer";
  const isBoth = accountType === "both";

  async function submit() {
    setMessage("");
    setIsError(false);
    if (onClearError) onClearError();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      setIsError(true);
      setMessage("Enter your email and password to continue.");
      return;
    }
    if (isSignUp && !name.trim()) {
      setIsError(true);
      setMessage("Add your name so neighbours know what to call you.");
      return;
    }
    if (isSignUp && password.length < 6) {
      setIsError(true);
      setMessage("Choose a password with at least 6 characters.");
      return;
    }

    setBusy(true);
    setActivePortal(accountType);
    const profileRole = isBoth ? "both" : isVolunteer ? "volunteer" : "seeker";

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: name.trim(),
              role: profileRole,
              account_type: accountType,
            },
          },
        });
        if (error) throw error;

        if (data?.user) {
          // If the email was already registered, ensure they don't cross-register
          const validation = await validatePortalAccess(
            data.user.id,
            accountType,
          );
          if (!validation.allowed) {
            await supabase.auth.signOut();
            setIsError(true);
            setMessage(
              `This email is already registered with a different role. You can only use the role you originally registered for.`,
            );
            return;
          }

          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              display_name: name.trim(),
              role: profileRole,
            });
          } catch {
            // Handled gracefully if DB trigger sets it
          }

          // Insert into designated tables: members, volunteers, or both
          try {
            if (isBoth) {
              await supabase.from("members").upsert({
                id: data.user.id,
                email: cleanEmail,
                display_name: name.trim(),
              });
              await supabase.from("volunteers").upsert({
                id: data.user.id,
                email: cleanEmail,
                display_name: name.trim(),
              });
            } else {
              const targetTable = isVolunteer ? "volunteers" : "members";
              await supabase.from(targetTable).upsert({
                id: data.user.id,
                email: cleanEmail,
                display_name: name.trim(),
              });
            }
          } catch {
            // Handled gracefully if table not yet created
          }
        }

        if (!data.session) {
          setMessage(
            "Account created! Check your email to confirm, then sign in.",
          );
          setMode("signin");
          setPassword("");
        } else {
          setMessage(
            `Welcome to the neighbourhood as ${isBoth ? "Member & Volunteer" : isVolunteer ? "a Volunteer" : "a Member"}!`,
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        if (data?.user) {
          const validation = await validatePortalAccess(
            data.user.id,
            accountType,
          );
          if (!validation.allowed) {
            await supabase.auth.signOut();
            setIsError(true);
            setMessage(
              validation.errorMessage ||
                `This email cannot sign in as ${isBoth ? "Member & Volunteer" : isVolunteer ? "a Volunteer" : "a Member"}.`,
            );
            return;
          }
        }
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not connect. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setIsError(false);
    if (onClearError) onClearError();
  }

  function changeAccountType(nextType) {
    setAccountType(nextType);
    setActivePortal(nextType);
    setMessage("");
    setIsError(false);
    if (onClearError) onClearError();
  }

  const roleLabel = isBoth
    ? "Member & Volunteer"
    : isVolunteer
      ? "Volunteer"
      : "Member";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/images/logo.jpg')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brand}>
              CouCou<Text style={styles.brandAccent}>Montreal</Text>
            </Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.kicker}>A NEIGHBOURHOOD THAT SAYS HELLO</Text>
            <Text style={styles.title}>
              {isBoth
                ? "Member & Volunteer"
                : isVolunteer
                  ? "Volunteer Portal"
                  : "Member Portal"}
            </Text>
            <Text style={styles.subtitle}>
              {isBoth
                ? "Get everyday support when you need it, and lend a hand to neighbours when you can."
                : isVolunteer
                  ? "Join our network of neighbourhood volunteers. Lend a hand and build community."
                  : "Connect with local neighbours for friendship, conversation circles, and everyday help."}
            </Text>
          </View>

          <View style={styles.card}>
            {/* Division Tabs: Member vs Volunteer vs Both */}
            <Text style={styles.sectionLabel}>CHOOSE YOUR ROLE</Text>
            <View style={styles.rolePicker}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: accountType === "member" }}
                onPress={() => changeAccountType("member")}
                style={[
                  styles.roleOption,
                  accountType === "member" && styles.roleSelected,
                ]}
              >
                <Text style={styles.roleIcon}>👤</Text>
                <Text
                  style={[
                    styles.roleTitle,
                    accountType === "member" && styles.roleTitleSelected,
                  ]}
                >
                  Member
                </Text>
                <Text
                  style={[
                    styles.roleSubtitle,
                    accountType === "member" && styles.roleSubtitleSelected,
                  ]}
                >
                  Ask for help
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: accountType === "volunteer" }}
                onPress={() => changeAccountType("volunteer")}
                style={[
                  styles.roleOption,
                  accountType === "volunteer" && styles.roleSelected,
                ]}
              >
                <Text style={styles.roleIcon}>🤝</Text>
                <Text
                  style={[
                    styles.roleTitle,
                    accountType === "volunteer" && styles.roleTitleSelected,
                  ]}
                >
                  Volunteer
                </Text>
                <Text
                  style={[
                    styles.roleSubtitle,
                    accountType === "volunteer" && styles.roleSubtitleSelected,
                  ]}
                >
                  Offer help
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: accountType === "both" }}
                onPress={() => changeAccountType("both")}
                style={[
                  styles.roleOption,
                  accountType === "both" && styles.roleSelected,
                ]}
              >
                <Text style={styles.roleIcon}>🌟</Text>
                <Text
                  style={[
                    styles.roleTitle,
                    accountType === "both" && styles.roleTitleSelected,
                  ]}
                >
                  Both
                </Text>
                <Text
                  style={[
                    styles.roleSubtitle,
                    accountType === "both" && styles.roleSubtitleSelected,
                  ]}
                >
                  Ask & offer
                </Text>
              </Pressable>
            </View>

            {/* 100% Free Community Banner */}
            <View style={styles.freeBanner}>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>100% FREE COMMUNITY</Text>
              </View>
              <Text style={styles.freeDesc}>
                {isBoth
                  ? "Full dual access: you can post help requests and offer assistance to neighbours across all categories. Always 100% free."
                  : isVolunteer
                    ? "Volunteers offer everyday assistance, appointments support, language practice, and social visits. Always completely free."
                    : "Members can post help requests, join conversation circles, and meet local neighbours. Always completely free."}
              </Text>
            </View>

            {/* Switcher: Sign in vs Create account */}
            <View style={styles.switcher}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !isSignUp }}
                onPress={() => changeMode("signin")}
                style={[
                  styles.switchOption,
                  !isSignUp && styles.switchSelected,
                ]}
              >
                <Text
                  style={[
                    styles.switchText,
                    !isSignUp && styles.switchTextSelected,
                  ]}
                >
                  Sign in as {roleLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSignUp }}
                onPress={() => changeMode("signup")}
                style={[styles.switchOption, isSignUp && styles.switchSelected]}
              >
                <Text
                  style={[
                    styles.switchText,
                    isSignUp && styles.switchTextSelected,
                  ]}
                >
                  Create {roleLabel} account
                </Text>
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
                  placeholderTextColor="#929287"
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
                placeholderTextColor="#929287"
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
                autoComplete={isSignUp ? "new-password" : "current-password"}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                placeholder={
                  isSignUp ? "At least 6 characters" : "Your password"
                }
                placeholderTextColor="#929287"
                returnKeyType="go"
                secureTextEntry
                style={styles.input}
                textContentType={isSignUp ? "newPassword" : "password"}
                value={password}
              />
            </View>

            {!!message && (
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.message,
                  isError ? styles.error : styles.success,
                ]}
              >
                {message}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={submit}
              style={({ pressed }) => [
                styles.submit,
                (pressed || busy) && styles.dimmed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={palette.ink} />
              ) : (
                <Text style={styles.submitText}>
                  {isSignUp
                    ? `Join as ${roleLabel}`
                    : `Sign in as ${roleLabel}`}
                </Text>
              )}
            </Pressable>

            <Text style={styles.privacy}>
              Accounts are bound to their chosen role. You can only sign in
              through the portal matching your registered role.
            </Text>
          </View>

          <Text style={styles.footer}>
            Montréal is better when we help each other.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.cream },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  sun: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  sunGlyph: { color: palette.ink, fontSize: 22 },
  brand: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandAccent: { fontWeight: "500" },
  intro: { marginBottom: 20 },
  kicker: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 37,
    letterSpacing: -1,
    maxWidth: 450,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 450,
  },
  card: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    shadowColor: "#322F21",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  sectionLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  rolePicker: { flexDirection: "row", gap: 8, marginBottom: 16 },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: "#FAF9F4",
    alignItems: "center",
  },
  roleSelected: {
    borderColor: palette.ink,
    backgroundColor: palette.highlight,
  },
  roleIcon: { fontSize: 22, marginBottom: 4 },
  roleTitle: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  roleTitleSelected: { color: palette.ink },
  roleSubtitle: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },
  roleSubtitleSelected: { color: palette.ink },
  freeBanner: {
    backgroundColor: "#F6F9F5",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#DCEBDE",
    gap: 6,
  },
  freeBadge: {
    alignSelf: "flex-start",
    backgroundColor: palette.freeBadgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    color: palette.freeBadgeText,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  freeDesc: { color: palette.ink, fontSize: 13, lineHeight: 19 },
  switcher: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#F4F2E9",
    marginBottom: 18,
  },
  switchOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 11,
    paddingHorizontal: 8,
  },
  switchSelected: { backgroundColor: palette.yellow },
  switchText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  switchTextSelected: { color: palette.ink },
  fieldGroup: { marginBottom: 14 },
  label: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    minHeight: 50,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.ink,
    backgroundColor: "#FFFEFA",
    fontSize: 15,
  },
  message: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  error: { color: palette.error },
  success: { color: palette.success },
  submit: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: palette.yellow,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  submitText: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  dimmed: { opacity: 0.6 },
  privacy: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 14,
  },
  footer: {
    color: palette.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 22,
  },
});
