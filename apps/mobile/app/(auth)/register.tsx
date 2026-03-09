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

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
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
        <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder="Name (optional)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder="Password (min 6)"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.surface, borderColor: colors.error }]}>
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
          title={loading ? "Creating..." : "Register"}
          onPress={handleRegister}
          disabled={loading}
          color={colors.tint}
        />
        <View style={styles.footer}>
          <Text style={{ color: colors.textSecondary }}>Already have an account?</Text>
          <Pressable onPress={() => router.push("/(auth)/login" as const)}>
            <Text style={[styles.link, { color: colors.tint }]}> Sign in</Text>
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
    fontFamily: Font.bold,
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  errorBox: {
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  errorTitle: {
    fontFamily: Font.semiBold,
    marginBottom: 4,
    textAlign: "left",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  link: { fontFamily: Font.semiBold },
});
