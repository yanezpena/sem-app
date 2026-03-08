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

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, name: name || undefined });
      router.replace("/(drawer)/(tabs)/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Create account</Text>
        <TextInput
          style={styles.input}
          placeholder="Name (optional)"
          value={name}
          onChangeText={setName}
        />
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
          placeholder="Password (min 6)"
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
          title={loading ? "Creating..." : "Register"}
          onPress={handleRegister}
          disabled={loading}
        />
        <View style={styles.footer}>
          <Text>Already have an account?</Text>
          <Pressable onPress={() => router.push("/(auth)/login" as const)}>
            <Text style={styles.link}> Sign in</Text>
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  link: { color: "#0066cc" },
});
