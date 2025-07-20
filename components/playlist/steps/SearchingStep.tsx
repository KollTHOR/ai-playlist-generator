import { Search, CheckCircle, XCircle } from "lucide-react";
import { TrackAvailability } from "@/types";

interface SearchingStepProps {
  isProcessing: boolean;
  trackAvailability: TrackAvailability | null;
}

const SearchingStep: React.FC<SearchingStepProps> = ({
  isProcessing,
  trackAvailability,
}) => {
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <Search className="w-6 h-6 text-green-400 absolute top-3 left-3" />
        </div>
        <h3 className="text-lg font-semibold text-gray-100 mb-2">
          Searching Your Library
        </h3>
        <p className="text-gray-400 text-center max-w-md">
          Looking for recommended tracks in your Plex library...
        </p>
      </div>
    );
  }

  if (!trackAvailability) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No search data available</p>
      </div>
    );
  }

  const availableCount = trackAvailability.availableTracks;
  const totalCount = trackAvailability.totalTracksRecommended;
  const availabilityPercentage = Math.round(
    (availableCount / totalCount) * 100
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-2">
          Track Search Results
        </h2>
        <p className="text-gray-400 text-sm">
          Here&apos;s what we found in your Plex library.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">
            {availableCount}/{totalCount}
          </div>
          <p className="text-gray-300 mb-4">
            tracks available in your library ({availabilityPercentage}%)
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${availabilityPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100">
            Recommended Tracks
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Available tracks will be used for playlist generation
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-700">
            {trackAvailability.trackAvailability
              .slice(0, 20)
              .map((track, index) => (
                <div key={index} className="p-4 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {track.available ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 font-medium truncate">
                      {track.title}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      {track.artist} • {track.album}
                    </p>
                    <p className="text-gray-500 text-xs mt-1 truncate">
                      {track.reason}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        track.available
                          ? "bg-green-900/30 text-green-300 border border-green-700/50"
                          : "bg-red-900/30 text-red-300 border border-red-700/50"
                      }`}
                    >
                      {track.available ? "Available" : "Not Found"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          {trackAvailability.trackAvailability.length > 20 && (
            <div className="p-4 text-center text-gray-400 text-sm border-t border-gray-700">
              Showing first 20 of {trackAvailability.trackAvailability.length}{" "}
              recommendations
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchingStep;
