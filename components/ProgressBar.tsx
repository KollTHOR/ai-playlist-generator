"use client";

import React from "react";
import {
  Check,
  Music,
  Brain,
  Search,
  Sparkles,
  PlayCircle,
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
      title: "AI Model",
      description: "Choose model",
      icon: <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />,
      clickable: true,
    },
    {
      id: "data",
      title: "Data",
      description: "Load music",
      icon: <Music className="w-3 h-3 sm:w-4 sm:h-4" />,
      clickable: completedSteps.includes("model"),
    },
    {
      id: "analyzing",
      title: "Analysis",
      description: "Analyze taste",
      icon: <Brain className="w-3 h-3 sm:w-4 sm:h-4" />,
      clickable: completedSteps.includes("data"),
    },
    {
      id: "filtering",
      title: "Artists",
      description: "Find available",
      icon: <Search className="w-3 h-3 sm:w-4 sm:h-4" />,
      clickable: completedSteps.includes("analyzing"),
    },
    {
      id: "generating",
      title: "Generate",
      description: "Create playlist",
      icon: <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4" />,
      clickable: completedSteps.includes("filtering"),
    },
    {
      id: "review",
      title: "Review",
      description: "Finalize",
      icon: <Check className="w-3 h-3 sm:w-4 sm:h-4" />,
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
      relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-all duration-200 mb-1 sm:mb-2
      ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}
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
        return "w-6 h-6 sm:w-8 sm:h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0";
      case "current":
        return `w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 ${
          isProcessing ? "animate-pulse" : ""
        }`;
      default:
        return "w-6 h-6 sm:w-8 sm:h-8 bg-gray-600 text-gray-400 rounded-full flex items-center justify-center flex-shrink-0";
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-2 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h3 className="text-sm sm:text-lg font-semibold text-gray-200">
          Progress
        </h3>
        <div className="text-xs sm:text-sm text-gray-400">
          {steps.findIndex((s) => s.id === currentStep) + 1}/{steps.length}
        </div>
      </div>

      {/* Compact Vertical Progress Steps */}
      <div className="space-y-1 sm:space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            <div
              className={getStepClasses(step)}
              onClick={() =>
                step.clickable && !isProcessing && onStepClick(step.id)
              }
            >
              <div className={getIconClasses(step)}>
                {completedSteps.includes(step.id) ? (
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm truncate">
                  {step.title}
                </p>
                <p className="text-xs opacity-75 truncate hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Compact Connecting Line */}
            {index < steps.length - 1 && (
              <div className="flex justify-center">
                <div className="w-0.5 h-2 sm:h-3 bg-gray-600 my-0.5 sm:my-1"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compact Processing Indicator */}
      {isProcessing && (
        <div className="mt-2 sm:mt-4 text-center">
          <div className="inline-flex items-center gap-1 sm:gap-2 text-blue-400">
            <div className="w-2 h-2 sm:w-3 sm:h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
