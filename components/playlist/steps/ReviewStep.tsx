import { useState } from "react";
import { Play, RefreshCw, Music, Clock } from "lucide-react";
import { AIRecommendation } from "@/types";

interface ReviewStepProps {
  recommendations: AIRecommendation[];
  userToken: string;
  onPlaylistUpdate: (playlist: AIRecommendation[]) => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  recommendations,
  userToken,
  onPlaylistUpdate,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleRemoveTrack = (index: number) => {
    const updatedPlaylist = recommendations.filter((_, i) => i !== index);
    onPlaylistUpdate(updatedPlaylist);
  };

  const handleRegenerateTrack = async (index: number) => {
    // This would be implemented to regenerate a single track
    // For now, we'll just show the functionality
    console.log("Regenerating track at index:", index);
  };

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No playlist generated yet</p>
      </div>
    );
  }

  const totalDuration = recommendations.length * 3.5; // Estimate 3.5 minutes per track
  const formattedDuration = `${Math.floor(totalDuration / 60)}h ${Math.floor(
    totalDuration % 60
  )}m`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-2">
          Your AI-Generated Playlist
        </h2>
        <p className="text-gray-400 text-sm">
          Review and customize your playlist before creating it in Plex.
        </p>
      </div>

      {/* Playlist Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Music className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Tracks</p>
              <p className="text-lg font-semibold text-gray-100">
                {recommendations.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-gray-400">Duration</p>
              <p className="text-lg font-semibold text-gray-100">
                ~{formattedDuration}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Artists</p>
              <p className="text-lg font-semibold text-gray-100">
                {new Set(recommendations.map((r) => r.artist)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Tracks */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100">
            Playlist Tracks
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Click on any track to customize or remove it
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-700">
            {recommendations.map((track, index) => (
              <div
                key={index}
                className="p-4 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="text-gray-400 text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 font-medium truncate">
                      {track.title}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      {track.artist} {track.album && `• ${track.album}`}
                    </p>
                    <p className="text-gray-500 text-xs mt-1 truncate">
                      {track.reason}
                    </p>
                  </div>

                  <div className="flex-shrink-0 flex gap-2">
                    <button
                      onClick={() => handleRegenerateTrack(index)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Regenerate track"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveTrack(index)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove track"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;
