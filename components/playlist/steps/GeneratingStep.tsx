import { Sparkles, Music } from "lucide-react";

interface GeneratingStepProps {
  isProcessing: boolean;
}

const GeneratingStep: React.FC<GeneratingStepProps> = ({ isProcessing }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-6">
        <div className="animate-pulse">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-16 w-16 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-100 mb-2">
        Crafting Your Perfect Playlist
      </h3>

      <p className="text-gray-400 text-center max-w-lg mb-8">
        AI is carefully selecting the best tracks from your available music,
        considering flow, variety, and your personal taste preferences...
      </p>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Music className="w-4 h-4 animate-bounce" />
        <span>Analyzing track combinations...</span>
      </div>
    </div>
  );
};

export default GeneratingStep;
