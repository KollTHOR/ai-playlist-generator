"use client";

import { useState, useEffect } from "react";
import { Music } from "lucide-react";
import { PlexTrack, AIRecommendation } from "@/types";
import { useToast } from "../lib/ToastContext";

// Separate components
import PlexAuth from "./PlexAuth";
import ModelSelector from "./ModelSelector";
import ProgressSidebar from "./playlist/ProgressSidebar";
import StepContent from "./playlist/StepContent";
import NavigationFooter from "./playlist/NavigationFooter";
import { usePlaylistGenerator } from "@/hooks/usePlaylistGenerator";

const PlaylistGenerator: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userToken, setUserToken] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  // Use custom hook for playlist logic
  const {
    currentFlow,
    setCurrentFlow,
    selectedModel,
    setSelectedModel,
    listeningHistory,
    userLibrary,
    recommendations,
    setRecommendations,
    totalLibraryCount,
    loading,
    isProcessing,
    musicProfile,
    trackAvailability,
    completedSteps,
    filteredHistoryCount,
    loadPlexData,
    analyzeMusic,
    searchTracks,
    generatePlaylist,
    createPlaylist,
    markStepCompleted,
    handleStepNavigation,
  } = usePlaylistGenerator(userToken, userId);

  const { showError, showSuccess, showInfo } = useToast();

  // Authentication effect
  useEffect(() => {
    const storedToken = sessionStorage.getItem("plex_token");
    const storedUserId = sessionStorage.getItem("plex_user_id");
    const storedUsername = sessionStorage.getItem("plex_username");

    if (storedToken && storedUserId && storedUsername) {
      setUserToken(storedToken);
      setUserId(storedUserId);
      setUsername(storedUsername);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSuccess = (token: string, id: string, name: string) => {
    setUserToken(token);
    setUserId(id);
    setUsername(name);
    setIsAuthenticated(true);

    sessionStorage.setItem("plex_token", token);
    sessionStorage.setItem("plex_user_id", id);
    sessionStorage.setItem("plex_username", name);
  };

  const handleSignOut = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUserToken("");
    setUserId("");
    setUsername("");
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-md p-4">
          <PlexAuth onAuthSuccess={handleAuthSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-gray-800 shadow-xl border-b border-gray-700 flex-1 flex flex-col min-h-0">
          {/* Header */}
          <header className="p-3 sm:p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center gap-2">
                <Music className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6" />
                AI Playlist Generator
              </h1>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Progress Sidebar */}
            <ProgressSidebar
              username={username}
              currentStep={currentFlow}
              completedSteps={completedSteps}
              onStepClick={handleStepNavigation}
              onSignOut={handleSignOut}
              isProcessing={isProcessing || loading}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 p-3 sm:p-4 lg:p-6">
                <StepContent
                  currentFlow={currentFlow}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  listeningHistory={listeningHistory}
                  userToken={userToken}
                  filteredHistoryCount={filteredHistoryCount}
                  totalLibraryCount={totalLibraryCount}
                  loading={loading}
                  isProcessing={isProcessing}
                  musicProfile={musicProfile}
                  trackAvailability={trackAvailability}
                  recommendations={recommendations}
                  onPlaylistUpdate={setRecommendations}
                />
              </div>

              {/* Navigation Footer */}
              <NavigationFooter
                currentFlow={currentFlow}
                selectedModel={selectedModel}
                listeningHistory={listeningHistory}
                filteredHistoryCount={filteredHistoryCount}
                loading={loading}
                isProcessing={isProcessing}
                musicProfile={musicProfile}
                trackAvailability={trackAvailability}
                recommendations={recommendations}
                onNavigate={setCurrentFlow}
                onLoadData={loadPlexData}
                onAnalyze={analyzeMusic}
                onSearchTracks={searchTracks}
                onGenerate={generatePlaylist}
                onCreatePlaylist={createPlaylist}
                markStepCompleted={markStepCompleted}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistGenerator;
