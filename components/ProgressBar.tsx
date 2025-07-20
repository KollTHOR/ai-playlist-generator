"use client";

import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { PlaylistFlow } from "@/hooks/usePlaylistGenerator";

interface ProgressBarProps {
  currentStep: PlaylistFlow;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
  isProcessing: boolean;
}

interface Step {
  id: string;
  name: string;
  description: string;
}

const steps: Step[] = [
  {
    id: "model",
    name: "Model Selection",
    description: "Choose AI model",
  },
  {
    id: "data",
    name: "Load Data",
    description: "Import music data",
  },
  {
    id: "analyzing",
    name: "Analysis",
    description: "Analyze taste",
  },
  {
    id: "searching",
    name: "Search Tracks",
    description: "Find recommendations",
  },
  {
    id: "generating",
    name: "Generate",
    description: "Create playlist",
  },
  {
    id: "review",
    name: "Review",
    description: "Final review",
  },
];

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  completedSteps = [], // Provide default empty array
  onStepClick,
  isProcessing,
}) => {
  const isStepCompleted = (stepId: string): boolean => {
    return completedSteps.includes(stepId);
  };

  const isStepActive = (stepId: string): boolean => {
    return currentStep === stepId;
  };

  const isStepClickable = (stepId: string): boolean => {
    if (isProcessing) return false;
    // First step is always clickable
    if (stepId === "model") return true;
    // Other steps are clickable if they're completed or if the previous steps are completed
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    const previousStepsCompleted = steps
      .slice(0, stepIndex)
      .every((step) => isStepCompleted(step.id));
    return previousStepsCompleted;
  };

  const getStepStatus = (stepId: string) => {
    if (isStepCompleted(stepId)) return "completed";
    if (isStepActive(stepId)) return "active";
    if (isStepClickable(stepId)) return "available";
    return "disabled";
  };

  const getStatusIcon = (stepId: string) => {
    const status = getStepStatus(stepId);

    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "active":
        return (
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        );
      case "available":
        return <Circle className="w-5 h-5 text-blue-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColors = (stepId: string) => {
    const status = getStepStatus(stepId);

    switch (status) {
      case "completed":
        return "text-green-400 border-green-400 bg-green-900/20";
      case "active":
        return "text-blue-400 border-blue-400 bg-blue-900/30";
      case "available":
        return "text-blue-300 border-blue-500 bg-blue-900/10 hover:bg-blue-900/20";
      default:
        return "text-gray-500 border-gray-600 bg-gray-800/50";
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-300 mb-4">Progress</h4>

      {steps.map((step, index) => {
        const isClickable = isStepClickable(step.id);
        const statusColors = getStatusColors(step.id);

        return (
          <div key={step.id} className="relative">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${statusColors} ${
                isClickable ? "cursor-pointer" : "cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{getStatusIcon(step.id)}</div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{step.name}</div>
                  <div className="text-xs opacity-75">{step.description}</div>
                </div>

                {isStepActive(step.id) && isProcessing && (
                  <div className="flex-shrink-0">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
                  </div>
                )}
              </div>
            </button>

            {/* Connection line to next step */}
            {index < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowRight className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        );
      })}

      {/* Progress Summary */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          {completedSteps.length} of {steps.length} steps completed
        </div>

        {/* Progress bar */}
        <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(completedSteps.length / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
