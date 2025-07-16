"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const AuthCallback = () => {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Plex
      if (event.origin !== "https://app.plex.tv") return;

      if (event.data.type === "AUTH_COMPLETE") {
        const authData = event.data.response;

        if (authData.authToken) {
          setStatus("success");
          setMessage("Authentication successful! Redirecting...");

          // Store auth data in sessionStorage
          sessionStorage.setItem("plex_token", authData.authToken);
          sessionStorage.setItem("plex_user_id", authData.id.toString());
          sessionStorage.setItem("plex_username", authData.username);

          // Redirect back to main app
          setTimeout(() => {
            router.push("/?auth=success");
          }, 2000);
        } else {
          setStatus("error");
          setMessage("Authentication failed - no token received");
        }
      }
    };

    // Listen for messages from Plex
    window.addEventListener("message", handleMessage);

    // Also check if we're in an iframe and need to communicate with parent
    if (window.parent !== window) {
      // We're in an iframe, check for URL parameters as fallback
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        // Traditional code-based flow
        exchangeCodeForToken(code);
      } else {
        // Wait for message-based auth
        setMessage("Waiting for authentication completion...");
      }
    } else {
      // We're in the main window, check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        exchangeCodeForToken(code);
      } else {
        setStatus("error");
        setMessage("No authentication code received");
      }
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [router]);

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch("/api/plex/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus("success");
        setMessage("Authentication successful! Redirecting...");

        sessionStorage.setItem("plex_token", result.authToken);
        sessionStorage.setItem("plex_user_id", result.user.id.toString());
        sessionStorage.setItem("plex_username", result.user.username);

        setTimeout(() => {
          router.push("/?auth=success");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(result.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth exchange error:", error);
      setStatus("error");
      setMessage("Authentication processing failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-8 max-w-md w-full">
        <div className="text-center">
          {status === "processing" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                Processing Authentication
              </h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                Authentication Successful!
              </h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-400 mb-4">{message}</p>
              <button
                onClick={() => router.push("/")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Return to App
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
