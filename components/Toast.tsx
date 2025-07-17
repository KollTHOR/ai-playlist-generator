"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface ToastProps {
  message: string;
  type: "error" | "success" | "info";
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "error":
        return "bg-red-900/90 border-red-700";
      case "success":
        return "bg-green-900/90 border-green-700";
      case "info":
        return "bg-blue-900/90 border-blue-700";
    }
  };

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div
        className={`${getBgColor()} border rounded-lg shadow-lg p-4 w-full min-w-0`}
      >
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-100 break-words leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
