"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const AuthSuccess = () => {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [message, setMessage] = useState("Completing authentication...");

  useEffect(() => {
    const completeAuth = async () => {
      try {
        const pinId = sessionStorage.getItem("plex_auth_pin_id");

        if (!pinId) {
          throw new Error("No PIN ID found");
        }

        console.log("Checking PIN status for:", pinId);

        const maxAttempts = 30;
        let attempts = 0;

        const checkAuthStatus = async (): Promise<void> => {
          attempts++;

          if (attempts > maxAttempts) {
            throw new Error("Authentication check timed out");
          }

          try {
            const response = await fetch(
              `https://plex.tv/api/v2/pins/${pinId}`,
              {
                headers: {
                  Accept: "application/json",
                  "X-Plex-Product": "AI Playlist Generator",
                  "X-Plex-Version": "1.0",
                  "X-Plex-Client-Identifier": "ai-playlist-generator",
                  "X-Plex-Platform": "Web",
                  "X-Plex-Device": "Web Browser",
                  "X-Plex-Device-Name": "AI Playlist Generator",
                },
              }
            );

            const pinData = await response.json();

            if (pinData.authToken) {
              console.log("Auth token received:", pinData.authToken);

              // Get comprehensive user info
              const userResponse = await fetch("https://plex.tv/api/v2/user", {
                headers: {
                  Accept: "application/json",
                  "X-Plex-Token": pinData.authToken,
                },
              });

              const userData = await userResponse.json();
              console.log("Complete user data:", userData);

              // Send enhanced success message to parent
              if (window.opener) {
                window.opener.postMessage(
                  {
                    type: "PLEX_AUTH_SUCCESS",
                    authToken: pinData.authToken,
                    userId: userData.id.toString(),
                    username: userData.username || userData.title,
                    isAdmin: userData.homeAdmin,
                    isHomeUser: userData.home,
                    userAccountId: userData.id,
                    timestamp: Date.now(),
                  },
                  window.location.origin
                );
              }

              setStatus("success");
              setMessage("Authentication successful! Closing window...");

              sessionStorage.removeItem("plex_auth_pin_id");

              setTimeout(() => {
                window.close();
              }, 2000);
            } else if (pinData.expired) {
              throw new Error("Authentication PIN has expired");
            } else {
              setTimeout(checkAuthStatus, 2000);
            }
          } catch (error) {
            console.error("PIN check error:", error);
            setTimeout(checkAuthStatus, 2000);
          }
        };

        await checkAuthStatus();
      } catch (error) {
        console.error("Auth completion error:", error);
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Authentication failed"
        );
      }
    };

    completeAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-8 max-w-md w-full text-center">
        {status === "processing" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
            <h1 className="text-xl font-semibold text-gray-100 mb-2">
              Completing Authentication
            </h1>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h1 className="text-2xl font-semibold text-gray-100 mb-2">
              Authentication Successful!
            </h1>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h1 className="text-2xl font-semibold text-gray-100 mb-2">
              Authentication Failed
            </h1>
            <p className="text-gray-400 mb-4">{message}</p>
            <button
              onClick={() => window.close()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthSuccess;
