"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Brain,
  Music,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
  description?: string;
  estimatedTime?: string;
}

interface AIProcessingStatusProps {
  isProcessing: boolean;
  currentStep?: string;
  error?: string;
  onCancel?: () => void;
}

const AIProcessingStatus: React.FC<AIProcessingStatusProps> = ({
  isProcessing,
  currentStep,
  error,
  onCancel,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: "analyzing",
      label: "Analyzing Your Music Taste",
      status: "pending",
      description: "Processing your listening history and preferences",
      estimatedTime: "5-10 seconds",
    },
    {
      id: "fetching",
      label: "Fetching Popular Trends",
      status: "pending",
      description: "Getting current music trends from Last.fm",
      estimatedTime: "3-5 seconds",
    },
    {
      id: "generating",
      label: "AI is Creating Your Playlist",
      status: "pending",
      description: "Using AI to generate personalized recommendations",
      estimatedTime: "15-30 seconds",
    },
    {
      id: "matching",
      label: "Matching with Your Library",
      status: "pending",
      description: "Finding recommended tracks in your Plex library",
      estimatedTime: "2-3 seconds",
    },
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Update step status based on currentStep
  useEffect(() => {
    if (currentStep) {
      setSteps((prev) =>
        prev.map((step) => {
          if (step.id === currentStep) {
            return { ...step, status: "processing" };
          } else if (prev.find((s) => s.id === currentStep)?.id) {
            const currentIndex = prev.findIndex((s) => s.id === currentStep);
            const stepIndex = prev.findIndex((s) => s.id === step.id);
            if (stepIndex < currentIndex) {
              return { ...step, status: "completed" };
            }
          }
          return step;
        })
      );
    }
  }, [currentStep]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStepIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        );
    }
  };

  if (!isProcessing && !error) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-100">
              AI is Working on Your Playlist
            </h3>
            <p className="text-sm text-gray-400">
              Elapsed time: {formatTime(elapsedTime)}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1 rounded border border-gray-600 hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200 font-medium">Error occurred</span>
          </div>
          <p className="text-red-300 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Processing Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
              step.status === "processing"
                ? "bg-blue-900/30 border border-blue-700"
                : step.status === "completed"
                ? "bg-green-900/30 border border-green-700"
                : "bg-gray-700 border border-gray-600"
            }`}
          >
            {/* Step Content remains the same but with updated colors */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p
                  className={`font-medium ${
                    step.status === "processing"
                      ? "text-blue-200"
                      : step.status === "completed"
                      ? "text-green-200"
                      : "text-gray-200"
                  }`}
                >
                  {step.label}
                </p>
                {step.status === "pending" && (
                  <span className="text-xs text-gray-400">
                    ~{step.estimatedTime}
                  </span>
                )}
              </div>
              <p
                className={`text-sm mt-1 ${
                  step.status === "processing"
                    ? "text-blue-300"
                    : step.status === "completed"
                    ? "text-green-300"
                    : "text-gray-400"
                }`}
              >
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Overall Progress</span>
          <span>
            {steps.filter((s) => s.status === "completed").length} of{" "}
            {steps.length} steps
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${
                (steps.filter((s) => s.status === "completed").length /
                  steps.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>

      {/* Fun Messages */}
      {isProcessing && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 font-medium">Did you know?</span>
          </div>
          <p className="text-purple-300 text-sm mt-1">
            AI is analyzing musical patterns, tempo, genre similarities, and
            your listening habits to create the perfect playlist just for you!
          </p>
        </div>
      )}
    </div>
  );
};

export default AIProcessingStatus;
