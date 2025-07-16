"use client";

import React from "react";
import {
  Check,
  Music,
  Brain,
  Search,
  Sparkles,
  PlayCircle,
  ChevronRight,
} from "lucide-react";

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  clickable: boolean;
}

interface ProgressBarProps {
  currentStep: string;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
  isProcessing?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
  isProcessing = false,
}) => {
  const steps: ProgressStep[] = [
    {
      id: "model",
      title: "Select AI Model",
      description: "Choose your AI model",
      icon: <Sparkles className="w-4 h-4" />,
      clickable: true,
    },
    {
      id: "data",
      title: "Load Music Data",
      description: "Fetch library & history",
      icon: <Music className="w-4 h-4" />,
      clickable: completedSteps.includes("model"),
    },
    {
      id: "analyzing",
      title: "AI Analysis",
      description: "Analyze music taste",
      icon: <Brain className="w-4 h-4" />,
      clickable: completedSteps.includes("data"),
    },
    {
      id: "filtering",
      title: "Find Artists",
      description: "Check availability",
      icon: <Search className="w-4 h-4" />,
      clickable: completedSteps.includes("analyzing"),
    },
    {
      id: "generating",
      title: "Generate Playlist",
      description: "Create recommendations",
      icon: <PlayCircle className="w-4 h-4" />,
      clickable: completedSteps.includes("filtering"),
    },
    {
      id: "review",
      title: "Review & Create",
      description: "Finalize playlist",
      icon: <Check className="w-4 h-4" />,
      clickable: completedSteps.includes("generating"),
    },
  ];

  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) return "completed";
    if (stepId === currentStep) return "current";
    return "pending";
  };

  const getStepClasses = (step: ProgressStep) => {
    const status = getStepStatus(step.id);
    const isClickable = step.clickable && !isProcessing;

    const baseClasses = `
    flex items-center gap-2 p-2 rounded-lg transition-all duration-200
    ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}
    overflow-hidden
  `;

    switch (status) {
      case "completed":
        return `${baseClasses} bg-green-900/30 border border-green-700 text-green-200 ${
          isClickable ? "hover:bg-green-900/50" : ""
        }`;
      case "current":
        return `${baseClasses} bg-blue-900/30 border border-blue-700 text-blue-200 ${
          isProcessing ? "animate-pulse" : ""
        }`;
      default:
        return `${baseClasses} bg-gray-700 border border-gray-600 text-gray-400`;
    }
  };

  const getIconClasses = (step: ProgressStep) => {
    const status = getStepStatus(step.id);

    switch (status) {
      case "completed":
        return "w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center";
      case "current":
        return `w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center ${
          isProcessing ? "animate-pulse" : ""
        }`;
      default:
        return "w-8 h-8 bg-gray-600 text-gray-400 rounded-full flex items-center justify-center";
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">
          Playlist Creation Progress
        </h3>
        <div className="text-sm text-gray-400">
          Step {steps.findIndex((s) => s.id === currentStep) + 1} of{" "}
          {steps.length}
        </div>
      </div>

      {/* Desktop Progress Bar - Fixed Layout */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-6 gap-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`${getStepClasses(step)} min-w-0`}
              onClick={() =>
                step.clickable && !isProcessing && onStepClick(step.id)
              }
            >
              <div className={getIconClasses(step)}>
                {completedSteps.includes(step.id) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{step.title}</p>
                <p className="text-xs opacity-75 truncate">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tablet Progress Bar - Compact Version */}
      <div className="hidden md:block lg:hidden">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {steps.slice(0, 3).map((step) => (
            <div
              key={step.id}
              className={`${getStepClasses(step)} min-w-0`}
              onClick={() =>
                step.clickable && !isProcessing && onStepClick(step.id)
              }
            >
              <div className={getIconClasses(step)}>
                {completedSteps.includes(step.id) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{step.title}</p>
                <p className="text-xs opacity-75 truncate">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {steps.slice(3).map((step) => (
            <div
              key={step.id}
              className={`${getStepClasses(step)} min-w-0`}
              onClick={() =>
                step.clickable && !isProcessing && onStepClick(step.id)
              }
            >
              <div className={getIconClasses(step)}>
                {completedSteps.includes(step.id) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{step.title}</p>
                <p className="text-xs opacity-75 truncate">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Progress Bar */}
      <div className="md:hidden">
        {/* Current Step Display */}
        <div className="mb-4">
          {steps.map(
            (step) =>
              step.id === currentStep && (
                <div
                  key={step.id}
                  className={`${getStepClasses(step)} min-w-0`}
                >
                  <div className={getIconClasses(step)}>
                    {completedSteps.includes(step.id) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{step.title}</p>
                    <p className="text-sm opacity-75 truncate">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
          )}
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() =>
                step.clickable && !isProcessing && onStepClick(step.id)
              }
              disabled={!step.clickable || isProcessing}
              className={`w-3 h-3 rounded-full transition-colors ${
                completedSteps.includes(step.id)
                  ? "bg-green-500"
                  : step.id === currentStep
                  ? "bg-blue-500"
                  : "bg-gray-600"
              } ${
                step.clickable && !isProcessing
                  ? "cursor-pointer"
                  : "cursor-not-allowed"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
