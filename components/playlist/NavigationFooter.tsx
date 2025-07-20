import { Play } from "lucide-react";
import { PlaylistFlow } from "@/hooks/usePlaylistGenerator";
import {
  PlexTrack,
  AIRecommendation,
  MusicProfile,
  TrackAvailability,
} from "@/types";

interface NavigationFooterProps {
  currentFlow: PlaylistFlow;
  selectedModel: string;
  listeningHistory: PlexTrack[];
  filteredHistoryCount: number;
  loading: boolean;
  isProcessing: boolean;
  musicProfile: MusicProfile | null;
  trackAvailability: TrackAvailability | null;
  recommendations: AIRecommendation[];
  onNavigate: (step: PlaylistFlow) => void;
  onLoadData: () => void;
  onAnalyze: () => void;
  onSearchTracks: () => void;
  onGenerate: () => void;
  onCreatePlaylist: () => void;
  markStepCompleted: (step: string) => void;
}

const NavigationFooter: React.FC<NavigationFooterProps> = ({
  currentFlow,
  selectedModel,
  listeningHistory,
  filteredHistoryCount,
  loading,
  isProcessing,
  musicProfile,
  trackAvailability,
  recommendations,
  onNavigate,
  onLoadData,
  onAnalyze,
  onSearchTracks,
  onGenerate,
  onCreatePlaylist,
  markStepCompleted,
}) => {
  const renderButtons = () => {
    switch (currentFlow) {
      case "model":
        return (
          <button
            onClick={() => {
              markStepCompleted("model");
              onNavigate("data");
              onLoadData();
            }}
            disabled={!selectedModel}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5" />
            {selectedModel
              ? `Continue with ${
                  selectedModel.split("/")[1] || "Selected Model"
                }`
              : "Select a model to continue"}
          </button>
        );

      case "data":
        return (
          !loading && (
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => onNavigate("model")}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Back to Model
              </button>
              <button
                onClick={onAnalyze}
                disabled={listeningHistory.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Analyze ({filteredHistoryCount || listeningHistory.length})
              </button>
            </div>
          )
        );

      case "analyzing":
        return (
          !isProcessing &&
          musicProfile && (
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => onNavigate("data")}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Back to Data
              </button>
              <button
                onClick={onSearchTracks}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Search Tracks
              </button>
            </div>
          )
        );

      case "searching":
        return (
          !isProcessing &&
          trackAvailability && (
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => onNavigate("analyzing")}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Back to Analysis
              </button>
              <button
                onClick={onGenerate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Generate Playlist
              </button>
            </div>
          )
        );

      case "review":
        return (
          recommendations.length > 0 && (
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => onNavigate("searching")}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Back to Search
              </button>
              <button
                onClick={onCreatePlaylist}
                disabled={loading || recommendations.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                {loading
                  ? "Creating..."
                  : `Create Playlist (${recommendations.length})`}
              </button>
            </div>
          )
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-shrink-0 p-3 sm:p-4 lg:p-6 border-t border-gray-700">
      {renderButtons()}
    </div>
  );
};

export default NavigationFooter;
