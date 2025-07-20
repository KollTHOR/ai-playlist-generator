import { User } from "lucide-react";
import ProgressBar from "../ProgressBar";
import { PlaylistFlow } from "@/hooks/usePlaylistGenerator";

interface ProgressSidebarProps {
  username: string;
  currentStep: PlaylistFlow;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
  onSignOut: () => void;
  isProcessing: boolean;
}

const ProgressSidebar: React.FC<ProgressSidebarProps> = ({
  username,
  currentStep,
  completedSteps,
  onStepClick,
  onSignOut,
  isProcessing,
}) => {
  return (
    <div className="w-80 lg:w-1/4 xl:w-1/5 border-r border-gray-700 flex flex-col min-h-0">
      {/* User Info */}
      <div className="p-3 sm:p-4 flex-shrink-0">
        <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-sm text-gray-200 block truncate">
                  {username}
                </span>
                <span className="text-xs text-gray-400">Online</span>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="text-xs text-gray-400 hover:text-gray-200 flex-shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3 sm:pb-4 min-h-0">
        <ProgressBar
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={onStepClick}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default ProgressSidebar;
