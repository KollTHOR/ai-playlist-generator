"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import Toast from "@/components/Toast";

interface ToastData {
  id: string;
  message: string;
  type: "error" | "success" | "info";
  duration?: number;
}

interface ToastContextType {
  showToast: (
    message: string,
    type: "error" | "success" | "info",
    duration?: number
  ) => void;
  showError: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (message: string, type: "error" | "success" | "info", duration = 5000) => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    []
  );

  const showError = useCallback(
    (message: string, duration = 5000) => {
      showToast(message, "error", duration);
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, duration = 5000) => {
      showToast(message, "success", duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration = 5000) => {
      showToast(message, "info", duration);
    },
    [showToast]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider
      value={{ showToast, showError, showSuccess, showInfo }}
    >
      {children}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
        <div className="space-y-2">
          {toasts.map((toast, index) => (
            <div key={toast.id} className="w-full pointer-events-auto">
              <Toast
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onClose={() => removeToast(toast.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
