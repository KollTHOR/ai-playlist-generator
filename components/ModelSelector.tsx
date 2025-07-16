"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, Star, Zap } from "lucide-react";
import { ModelOption } from "@/types";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  className = "",
}) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/openrouter/models");
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error("Error fetching models:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesSearch =
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFreeFilter = showFreeOnly ? model.isFree : true;

      return matchesSearch && matchesFreeFilter;
    });
  }, [models, searchTerm, showFreeOnly]);

  const selectedModelInfo = models.find((m) => m.id === selectedModel);

  const groupedModels = useMemo(() => {
    const groups: { [key: string]: ModelOption[] } = {};
    filteredModels.forEach((model) => {
      if (!groups[model.provider]) {
        groups[model.provider] = [];
      }
      groups[model.provider].push(model);
    });
    return groups;
  }, [filteredModels]);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Select AI Model ({models.filter((m) => m.isFree).length} free models
        available)
      </label>

      {/* Selected Model Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border border-gray-600 rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center space-x-2">
          {selectedModelInfo?.isFree && (
            <Star className="w-4 h-4 text-green-400" fill="currentColor" />
          )}
          <span
            className={`font-medium ${!selectedModel ? "text-gray-400" : ""}`}
          >
            {selectedModelInfo?.name || "Select a model..."}
          </span>
          {selectedModelInfo && (
            <span className="text-sm text-gray-400">
              ({selectedModelInfo.provider})
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search and Filter Controls */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="freeOnly"
                checked={showFreeOnly}
                onChange={(e) => setShowFreeOnly(e.target.checked)}
                className="rounded focus:ring-blue-500 bg-gray-700 border-gray-600"
              />
              <label
                htmlFor="freeOnly"
                className="text-sm text-gray-300 flex items-center space-x-1"
              >
                <Star className="w-3 h-3 text-green-400" />
                <span>Free models only</span>
              </label>
            </div>
          </div>

          {/* Models List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                Loading models...
              </div>
            ) : (
              Object.entries(groupedModels).map(
                ([provider, providerModels]) => (
                  <div
                    key={provider}
                    className="border-b border-gray-700 last:border-b-0"
                  >
                    <div className="px-3 py-2 bg-gray-700 text-sm font-medium text-gray-300 capitalize">
                      {provider}
                    </div>
                    {providerModels.map((model) => (
                      <div
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.id);
                          setIsOpen(false);
                        }}
                        className={`px-3 py-2 hover:bg-gray-700 cursor-pointer border-l-4 transition-colors ${
                          selectedModel === model.id
                            ? "border-blue-500 bg-gray-700"
                            : "border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {model.isFree && (
                              <Star
                                className="w-4 h-4 text-green-400"
                                fill="currentColor"
                              />
                            )}
                            <span className="font-medium text-gray-100">
                              {model.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <span>
                              {Math.floor(model.contextLength / 1000)}K context
                            </span>
                            {model.category !== "text" && (
                              <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded">
                                {model.category}
                              </span>
                            )}
                          </div>
                        </div>
                        {model.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {model.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )
            )}
          </div>

          {/* Results Summary */}
          <div className="p-2 bg-gray-700 border-t border-gray-600 text-xs text-gray-400 text-center">
            Showing {filteredModels.length} of {models.length} models
            {showFreeOnly && ` (free only)`}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
