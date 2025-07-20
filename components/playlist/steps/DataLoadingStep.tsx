import { Music, Users, Clock } from "lucide-react";
import { PlexTrack } from "@/types";
import HistoryDisplay from "../../HistoryDisplay";

interface DataLoadingStepProps {
  listeningHistory: PlexTrack[];
  userToken: string;
  totalLibraryCount: number;
  filteredHistoryCount: number;
  loading: boolean;
}

const DataLoadingStep: React.FC<DataLoadingStepProps> = ({
  listeningHistory,
  userToken,
  totalLibraryCount,
  filteredHistoryCount,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400">Loading your music data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-2">
          Your Music Data
        </h2>
        <p className="text-gray-400 text-sm">
          Review your listening history and music library data.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Recent Plays</p>
              <p className="text-lg font-semibold text-gray-100">
                {listeningHistory.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Music className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-gray-400">Library Tracks</p>
              <p className="text-lg font-semibold text-gray-100">
                {totalLibraryCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Unique Artists</p>
              <p className="text-lg font-semibold text-gray-100">
                {new Set(listeningHistory.map((t) => t.grandparentTitle)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History Display */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100">
            Recent Listening History
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            This data will be used to understand your music taste
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <HistoryDisplay history={listeningHistory} userToken={userToken} />
        </div>
      </div>
    </div>
  );
};

export default DataLoadingStep;
