"use client";

import { useState } from "react";
import { X, ArrowUp, ArrowDown } from "lucide-react";
import { AIRecommendation } from "@/types";

interface PlaylistPreviewProps {
  recommendations: AIRecommendation[];
  onRecommendationsChange: (recommendations: AIRecommendation[]) => void;
  onCreatePlaylist: (title: string) => void;
}

const PlaylistPreview: React.FC<PlaylistPreviewProps> = ({
  recommendations,
  onRecommendationsChange,
  onCreatePlaylist,
}) => {
  const [playlistTitle, setPlaylistTitle] = useState(
    `AI Playlist ${new Date().toLocaleDateString()}`
  );

  const removeTrack = (index: number) => {
    const newRecs = recommendations.filter((_, i) => i !== index);
    onRecommendationsChange(newRecs);
  };

  const moveTrack = (index: number, direction: "up" | "down") => {
    const newRecs = [...recommendations];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newRecs.length) {
      [newRecs[index], newRecs[targetIndex]] = [
        newRecs[targetIndex],
        newRecs[index],
      ];
      onRecommendationsChange(newRecs);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={playlistTitle}
          onChange={(e) => setPlaylistTitle(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-md"
          placeholder="Playlist name"
        />
        <button
          onClick={() => onCreatePlaylist(playlistTitle)}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Create in Plex
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
        <div className="space-y-2">
          {recommendations.map((track, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 bg-white rounded border"
            >
              <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{track.title}</p>
                <p className="text-sm text-gray-600">{track.artist}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveTrack(index, "up")}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveTrack(index, "down")}
                  disabled={index === recommendations.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeTrack(index)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlaylistPreview;
