"use client";

import { ReactNode } from "react";

interface PulseButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const PulseButton: React.FC<PulseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden transition-all duration-300
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:scale-105 active:scale-95"
        }
        ${className}
      `}
    >
      {disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-75 animate-pulse" />
      )}
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </button>
  );
};

export default PulseButton;
