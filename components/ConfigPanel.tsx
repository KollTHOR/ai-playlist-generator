"use client";

import { useState } from "react";
import { Settings, Save } from "lucide-react";

interface ConfigPanelProps {
  onConfigSave: (config: PlaylistConfig) => void;
}

export interface PlaylistConfig {
  playlistLength: number;
  includePopular: boolean;
  genreFilter?: string;
  moodFilter?: string;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConfigSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<PlaylistConfig>({
    playlistLength: 20,
    includePopular: true,
    genreFilter: "",
    moodFilter: "",
  });

  const handleSave = () => {
    onConfigSave(config);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
      >
        <Settings className="w-4 h-4" />
        Configure
      </button>
    );
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-gray-800">Playlist Configuration</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Playlist Length
          </label>
          <input
            type="number"
            value={config.playlistLength}
            onChange={(e) =>
              setConfig({ ...config, playlistLength: parseInt(e.target.value) })
            }
            min="10"
            max="100"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genre Filter (optional)
          </label>
          <input
            type="text"
            value={config.genreFilter}
            onChange={(e) =>
              setConfig({ ...config, genreFilter: e.target.value })
            }
            placeholder="e.g., rock, jazz, electronic"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mood Filter (optional)
          </label>
          <input
            type="text"
            value={config.moodFilter}
            onChange={(e) =>
              setConfig({ ...config, moodFilter: e.target.value })
            }
            placeholder="e.g., energetic, chill, upbeat"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="includePopular"
            checked={config.includePopular}
            onChange={(e) =>
              setConfig({ ...config, includePopular: e.target.checked })
            }
            className="mr-2"
          />
          <label htmlFor="includePopular" className="text-sm text-gray-700">
            Include popular tracks in analysis
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4" />
          Save Config
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
