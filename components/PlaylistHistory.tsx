"use client";

import { useState, useEffect } from "react";
import { Clock, Play } from "lucide-react";

interface PlaylistHistoryItem {
  id: string;
  title: string;
  createdAt: string;
  trackCount: number;
  model: string;
}

const PlaylistHistory: React.FC = () => {
  const [history, setHistory] = useState<PlaylistHistoryItem[]>([]);

  useEffect(() => {
    // Load from localStorage
    const savedHistory = localStorage.getItem("playlistHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const addToHistory = (item: PlaylistHistoryItem) => {
    const newHistory = [item, ...history.slice(0, 9)]; // Keep last 10
    setHistory(newHistory);
    localStorage.setItem("playlistHistory", JSON.stringify(newHistory));
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Recent Playlists
      </h3>

      {history.length === 0 ? (
        <p className="text-gray-500 text-sm">No playlists created yet</p>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 bg-white rounded border"
            >
              <div>
                <p className="font-medium text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-600">
                  {item.trackCount} tracks • {item.model} •{" "}
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <Play className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistHistory;
