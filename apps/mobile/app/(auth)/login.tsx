import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/Colors";
import { Font } from "@/constants/Theme";
import { useColorScheme } from "@/components/useColorScheme";

export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      router.replace("/(drawer)/(tabs)/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login({
        email: "user@example.com",
        password: "password123",
      });
      router.replace("/(drawer)/(tabs)/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Test login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      router.replace("/(drawer)/(tabs)/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google login failed");
    }
  };

  const handleFacebookLogin = async () => {
    setError(null);
    try {
      await loginWithFacebook();
      router.replace("/(drawer)/(tabs)/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Facebook login failed");
    }
  };

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Sign In</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colorScheme === "light" ? "#FEE2E2" : "#7f1d1d" }]}>
            <Text style={[styles.errorTitle, { color: colors.error }]}>Please check the following:</Text>
            {error.split("\n").map((line, idx) =>
              line.trim() ? (
                <Text key={idx} style={[styles.errorText, { color: colors.error }]}>
                  • {line.trim().replace(/\.$/, "")}
                </Text>
              ) : null,
            )}
          </View>
        )}
        <Button
          title={loading ? "Signing in..." : "Sign In"}
          onPress={handleLogin}
          disabled={loading}
        />
        <View style={styles.divider}>
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
        </View>
        <Button
          title="Continue with Google"
          onPress={handleGoogleLogin}
          color="#4285F4"
        />
        <Button
          title="Continue with Facebook"
          onPress={handleFacebookLogin}
          color="#1877F2"
        />
        {__DEV__ && (
          <Pressable
            style={styles.testLoginBtn}
            onPress={handleTestLogin}
            disabled={loading}
          >
            <Text style={[styles.testLoginText, { color: "#92400e" }]}>Test login (no password)</Text>
          </Pressable>
        )}
        <View style={styles.footer}>
          <Text style={{ color: colors.textSecondary }}>New here?</Text>
          <Pressable onPress={() => router.push("/(auth)/register" as const)}>
            <Text style={[styles.link, { color: colors.tint }]}> Create an account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: Font.bold,
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  errorBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily: Font.semiBold,
    marginBottom: 4,
    textAlign: "left",
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: { marginVertical: 20, alignItems: "center" },
  dividerText: { fontSize: 14, fontFamily: Font.medium },
  testLoginBtn: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  testLoginText: { fontSize: 14, fontFamily: Font.medium },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  link: { fontFamily: Font.semiBold },
});
