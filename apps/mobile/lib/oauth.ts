import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type { AuthResponse } from "shared";

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

const isWeb = Platform.OS === "web";

export async function signInWithGoogle(): Promise<AuthResponse> {
  try {
    console.log("🔐 Starting Google OAuth flow...");

    if (isWeb) {
      // web-specific flow using promptAsync; redirect URI must be registered in Google
      console.log("🌐 Running web OAuth path");
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new Error("Google Client ID is not configured for web.");
      }
      const redirectUri = AuthSession.makeRedirectUri();
      console.log("🌐 Web redirect URI:", redirectUri);
      const request = new AuthSession.AuthRequest({
        clientId: googleClientId,
        scopes: ["openid", "profile", "email"],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        // We let the backend perform a standard authorization code exchange
        // with client secret, so PKCE is not needed here.
        usePKCE: false,
      });
      const googleAuthEndpoint =
        process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENDPOINT ??
        "https://accounts.google.com/o/oauth2/v2/auth";
      const result = await request.promptAsync({
        authorizationEndpoint: googleAuthEndpoint,
      });
      console.log("🌐 Web OAuth result:", result);
      if (result.type === "success" && result.params.code) {
        const resp = await fetch(`${API_URL}/auth/google/web`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: result.params.code,
            redirectUri,
          }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || "Backend verification failed");
        }
        return resp.json();
      }
      throw new Error("Web Google login cancelled");
    }

    // Create a deep link callback URL
    const redirectUrl = AuthSession.makeRedirectUri({
      path: "oauth-callback/google",
    });

    console.log("🔐 Redirect URL (for mobile app callback):", redirectUrl);

    // Construct the init URL with the redirect_uri parameter
    const initUrl = `${API_URL}/auth/google/mobile/init?redirect_uri=${encodeURIComponent(redirectUrl)}`;

    console.log("🔐 Init URL:", initUrl);

    // Open the browser for OAuth authentication
    const result = (await WebBrowser.openAuthSessionAsync(
      initUrl,
      redirectUrl,
    )) as WebBrowser.WebBrowserAuthSessionResult & { url?: string };

    console.log("🔐 OAuth result type:", result.type);
    console.log("🔐 OAuth result URL:", result.url);

    if (result.type === "success" && result.url) {
      // Extract the token from the URL
      const urlParams = new URL(result.url).searchParams;
      const token = urlParams.get("token");

      console.log("🔐 Extracted token from URL:", !!token);

      if (token) {
        console.log("🔐 Successfully received token from backend");

        // Exchange the token for user data by calling the backend
        const response = await fetch(`${API_URL}/auth/google/mobile/exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || "Failed to authenticate with Google");
        }

        const auth = await response.json();
        return auth;
      }
    }

    console.log("🔐 Google OAuth cancelled or failed");
    throw new Error("Google authentication cancelled");
  } catch (error: any) {
    console.error("🔴 Google OAuth error:", error);
    if (error instanceof Error) {
      console.error("🔴 Error message:", error.message);
      console.error("🔴 Error stack:", error.stack);
    } else {
      console.error("🔴 Non-Error object caught:", JSON.stringify(error));
    }
    throw error;
  }
}

export async function signInWithFacebook(): Promise<AuthResponse> {
  try {
    console.log("🔐 Starting Facebook OAuth flow (backend-driven)...");

    if (isWeb) {
      console.warn(
        "⚠️  WARNING: OAuth is not supported in web mode (localhost:8081). Please use Expo Go on a device or simulator instead.",
      );
      throw new Error(
        "OAuth not supported in web mode. Use Expo Go on a device or iOS/Android simulator instead.",
      );
    }

    // Create a deep link callback URL
    const redirectUrl = AuthSession.makeRedirectUri({
      path: "oauth-callback/facebook",
    });

    console.log("🔐 Redirect URL (for mobile app callback):", redirectUrl);

    // Construct the init URL with the redirect_uri parameter
    const initUrl = `${API_URL}/auth/facebook/mobile/init?redirect_uri=${encodeURIComponent(redirectUrl)}`;

    console.log("🔐 Init URL:", initUrl);

    // Open the browser for OAuth authentication
    const result = (await WebBrowser.openAuthSessionAsync(
      initUrl,
      redirectUrl,
    )) as WebBrowser.WebBrowserAuthSessionResult & { url?: string };

    console.log("🔐 OAuth result type:", result.type);
    console.log("🔐 OAuth result URL:", result.url);

    if (result.type === "success" && result.url) {
      // Extract the token from the URL
      const urlParams = new URL(result.url).searchParams;
      const token = urlParams.get("token");

      console.log("🔐 Extracted token from URL:", !!token);

      if (token) {
        console.log("🔐 Successfully received token from backend");

        // Exchange the token for user data by calling the backend
        const response = await fetch(
          `${API_URL}/auth/facebook/mobile/exchange`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || "Failed to authenticate with Facebook");
        }

        const auth = await response.json();
        return auth;
      }
    }

    console.log("🔐 Facebook OAuth cancelled or failed");
    throw new Error("Facebook authentication cancelled");
  } catch (error: any) {
    console.error("🔴 Facebook OAuth error:", error);
    if (error instanceof Error) {
      console.error("🔴 Error message:", error.message);
      console.error("🔴 Error stack:", error.stack);
    } else {
      console.error("🔴 Non-Error object caught:", JSON.stringify(error));
    }
    throw error;
  }
}
