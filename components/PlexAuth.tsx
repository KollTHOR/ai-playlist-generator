"use client";

import { useState, useEffect } from "react";
import { User, Key, Server, CheckCircle, AlertCircle } from "lucide-react";

interface PlexAuthProps {
  onAuthSuccess: (userToken: string, userId: string, username: string) => void;
}

const PlexAuth: React.FC<PlexAuthProps> = ({ onAuthSuccess }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for auth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get("auth");
    const userToken = urlParams.get("token");
    const userId = urlParams.get("userId");
    const username = urlParams.get("user");
    const error = urlParams.get("error");

    if (authStatus === "success" && userToken && userId && username) {
      onAuthSuccess(userToken, userId, username);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      setAuthError("Authentication failed. Please try again.");
      setIsAuthenticating(false);
    }
  }, [onAuthSuccess]);

  const handleAuth = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/plex/auth");
      const { authUrl } = await response.json();

      // Open Plex auth in new window
      window.open(authUrl, "plex_auth", "width=600,height=700");
    } catch (error) {
      console.error("Auth initiation error:", error);
      setAuthError("Failed to initiate authentication");
      setIsAuthenticating(false);
    }
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
          <p className="text-red-200">{authError}</p>
        </div>
      )}

      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-gray-200">Secure Authentication</h3>
        </div>
        <ul className="space-y-2 text-sm text-gray-300 mb-6">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Uses official Plex OAuth for secure access</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Only requests access to your listening history</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Token stored securely in your browser session</span>
          </li>
        </ul>
      </div>

      <button
        onClick={handleAuth}
        disabled={isAuthenticating}
        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        {isAuthenticating ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Authenticating...
          </>
        ) : (
          <>
            <User className="w-5 h-5" />
            Sign in with Plex
          </>
        )}
      </button>
    </div>
  );
};

export default PlexAuth;
