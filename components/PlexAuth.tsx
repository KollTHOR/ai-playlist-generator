"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Server,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface PlexAuthProps {
  onAuthSuccess: (userToken: string, userId: string, username: string) => void;
}

const PlexAuth: React.FC<PlexAuthProps> = ({ onAuthSuccess }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const [authUrl, setAuthUrl] = useState<string>("");
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Enhanced message listener
    const handleMessage = (event: MessageEvent) => {
      console.log("Message received from popup:", event);
      console.log("Event origin:", event.origin);
      console.log("Window origin:", window.location.origin);
      console.log("Event data:", event.data);

      // Accept messages from multiple origins
      const allowedOrigins = [
        window.location.origin,
        "http://localhost:3000",
        "https://localhost:3000",
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.log("Message from unauthorized origin:", event.origin);
        return;
      }

      if (event.data.type === "PLEX_AUTH_SUCCESS") {
        console.log("Processing PLEX_AUTH_SUCCESS message");

        const {
          authToken,
          userId,
          username,
          isAdmin,
          userAccountId,
          isHomeUser,
        } = event.data;

        if (authToken) {
          console.log("Auth token found, completing authentication");
          console.log("User details:", {
            userId,
            username,
            isAdmin,
            userAccountId,
            isHomeUser,
          });

          handleAuthSuccess(
            authToken,
            userId,
            username,
            isAdmin,
            userAccountId,
            isHomeUser
          );
        } else {
          console.error("No authentication token found in message");
          setAuthError("Authentication data not found in response");
          setIsAuthenticating(false);
        }
      }
    };

    // Add message listener
    window.addEventListener("message", handleMessage);

    // Also listen for storage events as fallback
    const handleStorageAuth = () => {
      const token = sessionStorage.getItem("plex_auth_token");
      const userId = sessionStorage.getItem("plex_auth_user_id");
      const username = sessionStorage.getItem("plex_auth_username");
      const isAdmin = sessionStorage.getItem("plex_auth_is_admin");
      const userAccountId = sessionStorage.getItem("plex_auth_user_account_id");

      if (token && userId && username) {
        console.log("Found auth data in sessionStorage");
        handleAuthSuccess(
          token,
          userId,
          username,
          isAdmin === "true",
          userAccountId || userId
        );

        // Clean up storage
        sessionStorage.removeItem("plex_auth_token");
        sessionStorage.removeItem("plex_auth_user_id");
        sessionStorage.removeItem("plex_auth_username");
        sessionStorage.removeItem("plex_auth_is_admin");
        sessionStorage.removeItem("plex_auth_user_account_id");
      }
    };

    window.addEventListener("storage", handleStorageAuth);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorageAuth);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
      if (authWindow) {
        authWindow.close();
      }
    };
  }, []);

  const handleAuthSuccess = (
    token: string,
    userId: string,
    username: string,
    isAdmin?: boolean,
    userAccountId?: string,
    isHomeUser?: boolean
  ) => {
    console.log("Handling auth success:", {
      token: token.substring(0, 20) + "...",
      userId,
      username,
      isAdmin,
      userAccountId,
      isHomeUser,
    });

    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }

    if (authWindow) {
      authWindow.close();
    }

    // Store in session storage with enhanced user info
    sessionStorage.setItem("plex_token", token);
    sessionStorage.setItem("plex_user_id", userId);
    sessionStorage.setItem("plex_username", username);
    sessionStorage.setItem("plex_is_admin", isAdmin?.toString() || "false");
    sessionStorage.setItem("plex_user_account_id", userAccountId || userId);
    sessionStorage.setItem(
      "plex_is_home_user",
      isHomeUser?.toString() || "false"
    );

    onAuthSuccess(token, userId, username);
    setIsAuthenticating(false);
  };

  const handleAuth = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/plex/auth");
      const { authUrl, pinId } = await response.json();

      if (!authUrl || !pinId) {
        throw new Error("Invalid authentication response");
      }

      console.log("Starting auth with PIN ID:", pinId);

      // Store PIN ID for success page
      sessionStorage.setItem("plex_auth_pin_id", pinId);

      setAuthUrl(authUrl);

      // Open Plex auth in popup
      const newWindow = window.open(
        authUrl,
        "plex_auth",
        "width=600,height=700,scrollbars=yes,resizable=yes"
      );

      if (!newWindow) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      setAuthWindow(newWindow);

      // Set timeout for authentication
      authTimeoutRef.current = setTimeout(() => {
        if (newWindow && !newWindow.closed) {
          newWindow.close();
        }
        sessionStorage.removeItem("plex_auth_pin_id");
        setAuthError("Authentication timed out. Please try again.");
        setIsAuthenticating(false);
      }, 300000); // 5 minutes

      // Check if window was closed manually
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed);
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current);
          }
          if (isAuthenticating) {
            setAuthError("Authentication window was closed");
            setIsAuthenticating(false);
          }
        }
      }, 1000);
    } catch (error) {
      console.error("Auth initiation error:", error);
      setAuthError(
        error instanceof Error
          ? error.message
          : "Failed to initiate authentication"
      );
      setIsAuthenticating(false);
    }
  };

  const cancelAuth = () => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
    if (authWindow) {
      authWindow.close();
    }
    setIsAuthenticating(false);
    setAuthWindow(null);
    setAuthUrl("");
    sessionStorage.removeItem("plex_auth_pin_id");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center">
            <Server className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">
          Connect to Your Plex Account
        </h2>
        <p className="text-gray-400 mb-6">
          Sign in with your Plex account to access your personal listening
          history and create personalized playlists.
        </p>
      </div>

      {authError && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div className="flex-1">
            <p className="text-red-200">{authError}</p>
          </div>
          <button
            onClick={() => setAuthError(null)}
            className="text-red-400 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {isAuthenticating && (
        <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-blue-200 font-medium">
              Waiting for authentication...
            </span>
          </div>
          <p className="text-blue-300 text-sm mb-4">
            Complete your authentication in the popup window. The window will
            close automatically when done.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => authUrl && window.open(authUrl, "_blank")}
              className="flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Reopen Authentication
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-gray-200">
            Multi-Account Authentication
          </h3>
        </div>
        <ul className="space-y-2 text-sm text-gray-300 mb-6">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Supports both personal and admin accounts</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Automatically detects admin privileges</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Accesses history from all linked accounts</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Secure session-based token storage</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleAuth}
          disabled={isAuthenticating}
          className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <User className="w-5 h-5" />
              Sign in with Plex
            </>
          )}
        </button>

        {isAuthenticating && (
          <button
            onClick={cancelAuth}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default PlexAuth;
