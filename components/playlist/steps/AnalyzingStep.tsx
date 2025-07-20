import { Brain, Music, Palette, Calendar } from "lucide-react";
import { MusicProfile } from "@/types";

interface AnalyzingStepProps {
  isProcessing: boolean;
  musicProfile: MusicProfile | null;
}

const AnalyzingStep: React.FC<AnalyzingStepProps> = ({
  isProcessing,
  musicProfile,
}) => {
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <Brain className="w-6 h-6 text-blue-400 absolute top-3 left-3" />
        </div>
        <h3 className="text-lg font-semibold text-gray-100 mb-2">
          Analyzing Your Music Taste
        </h3>
        <p className="text-gray-400 text-center max-w-md">
          AI is analyzing your listening history to understand your music
          preferences and generate personalized track recommendations...
        </p>
      </div>
    );
  }

  if (!musicProfile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No analysis data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-2">
          Your Music Profile
        </h2>
        <p className="text-gray-400 text-sm">
          Based on your listening history, here&apos;s what we discovered about
          your taste.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genres */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-gray-100">Primary Genres</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {musicProfile.primaryGenres.map((genre, index) => (
              <span
                key={index}
                className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm border border-blue-700/50"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* Moods */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-gray-100">Moods & Vibes</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {musicProfile.moods.map((mood, index) => (
              <span
                key={index}
                className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-700/50"
              >
                {mood}
              </span>
            ))}
          </div>
        </div>

        {/* Styles */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-gray-100">Musical Styles</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {musicProfile.styles.map((style, index) => (
              <span
                key={index}
                className="bg-green-900/30 text-green-300 px-3 py-1 rounded-full text-sm border border-green-700/50"
              >
                {style}
              </span>
            ))}
          </div>
        </div>

        {/* Era & Energy */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-gray-100">Era & Energy</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Era:</span>
              <span className="bg-orange-900/30 text-orange-300 px-3 py-1 rounded-full text-sm border border-orange-700/50">
                {musicProfile.era}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Energy:</span>
              <span className="bg-red-900/30 text-red-300 px-3 py-1 rounded-full text-sm border border-red-700/50">
                {musicProfile.energy}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzingStep;
