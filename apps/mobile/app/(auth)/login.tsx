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
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  console.log("🟢 LoginScreen: Component rendered");

  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log("🔵 LoginScreen: Google login button pressed");
    setError(null);
    try {
      console.log("🔵 LoginScreen: Calling loginWithGoogle...");
      await loginWithGoogle();
      console.log(
        "🔵 LoginScreen: Google login successful, navigating to tabs",
      );
      router.replace("/(tabs)");
    } catch (e: any) {
      console.log("🔴 LoginScreen: Google login failed:", e.message);
      setError(e.message || "Google login failed");
    }
  };

  const handleFacebookLogin = async () => {
    setError(null);
    try {
      await loginWithFacebook();
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Facebook login failed");
    }
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Sign In</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Please check the following:</Text>
            {error.split("\n").map((line, idx) =>
              line.trim() ? (
                <Text key={idx} style={styles.errorText}>
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
          <Text style={styles.dividerText}>or</Text>
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
        <View style={styles.footer}>
          <Text>New here?</Text>
          <Pressable onPress={() => router.push("/register" as any)}>
            <Text style={styles.link}> Create an account</Text>
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
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorTitle: {
    color: "#991B1B",
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "left",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    lineHeight: 20,
  },
  divider: { marginVertical: 20, alignItems: "center" },
  dividerText: { color: "#666", fontSize: 14 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  link: { color: "#0066cc" },
});
