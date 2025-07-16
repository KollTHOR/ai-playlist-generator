/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Play,
  Music,
  Brain,
  Search,
  Users,
  Album,
  Loader2,
  User,
  AlertTriangle,
  Clock,
} from "lucide-react";
import ModelSelector from "./ModelSelector";
import { PlexTrack, AIRecommendation } from "@/types";
import HistoryDisplay from "./HistoryDisplay";
import ProgressBar from "./ProgressBar";
import PlexAuth from "./PlexAuth";
import { requestWithContinuation } from "@/lib/aiContinuation";
import PlaylistEditor from "./PlaylistEditor";

const PlaylistGenerator: React.FC = () => {
  // State management
  const [currentFlow, setCurrentFlow] = useState<
    "model" | "data" | "analyzing" | "filtering" | "generating" | "review"
  >("model");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [listeningHistory, setListeningHistory] = useState<PlexTrack[]>([]);
  const [userLibrary, setUserLibrary] = useState<PlexTrack[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(
    []
  );
  const [totalLibraryCount, setTotalLibraryCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Artist-based recommendation states
  const [artistAnalysis, setArtistAnalysis] = useState<any>(null);
  const [artistAvailability, setArtistAvailability] = useState<any>(null);
  const [albumAvailability, setAlbumAvailability] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const [filteredHistoryCount, setFilteredHistoryCount] = useState<number>(0);

  // ADD THIS: Plex configuration for client-side image loading
  const [plexConfig, setPlexConfig] = useState<{
    serverUrl: string;
    token: string;
  }>({
    serverUrl: "",
    token: "",
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userToken, setUserToken] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");

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

  const handleRegenerateTrack = async (index: number) => {
    if (index < 0 || index >= recommendations.length) {
      console.error("Invalid track index:", index);
      return;
    }

    setIsRegenerating(true);
    console.log("Regenerating track at index:", index);

    try {
      const trackToReplace = recommendations[index];
      console.log("Replacing track:", trackToReplace);

      const response = await fetch("/api/ai/regenerate-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicProfile: artistAnalysis.musicProfile,
          artistAvailability,
          albumAvailability,
          excludeTrack: trackToReplace,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Track regeneration failed: ${response.status}`);
      }

      const newTrack = await response.json();
      console.log("Generated new track:", newTrack);

      // Replace the track at the specific index
      const updatedPlaylist = [...recommendations];
      updatedPlaylist[index] = newTrack;

      setRecommendations(updatedPlaylist);
      console.log("Track replaced successfully");
    } catch (error) {
      console.error("Track regeneration error:", error);
      setError("Failed to regenerate track. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegeneratePlaylist = async () => {
    console.log("Regenerating entire playlist");
    setIsRegenerating(true);

    try {
      await generatePlaylistFromArtists();
      console.log("Playlist regenerated successfully");
    } catch (error) {
      console.error("Playlist regeneration error:", error);
      setError("Failed to regenerate playlist. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateInvalidTracks = async (invalidIndices: number[]) => {
    console.log("Regenerating invalid tracks at indices:", invalidIndices);
    setIsRegenerating(true);

    try {
      const updatedPlaylist = [...recommendations];
      let regeneratedCount = 0;

      // Regenerate only the invalid tracks
      for (const index of invalidIndices) {
        try {
          const response = await fetch("/api/ai/regenerate-track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              musicProfile: artistAnalysis.musicProfile,
              artistAvailability,
              albumAvailability,
              excludeTrack: updatedPlaylist[index],
              model: selectedModel,
            }),
          });

          if (response.ok) {
            const newTrack = await response.json();
            updatedPlaylist[index] = newTrack;
            regeneratedCount++;
            console.log(`Regenerated track ${index}:`, newTrack);
          }
        } catch (trackError) {
          console.error(`Failed to regenerate track ${index}:`, trackError);
        }
      }

      setRecommendations(updatedPlaylist);
      console.log(
        `Successfully regenerated ${regeneratedCount} out of ${invalidIndices.length} invalid tracks`
      );
    } catch (error) {
      console.error("Invalid tracks regeneration error:", error);
      setError("Failed to regenerate invalid tracks. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePlaylistUpdate = (updatedPlaylist: AIRecommendation[]) => {
    console.log("Updating playlist with", updatedPlaylist.length, "tracks");
    setRecommendations(updatedPlaylist);
  };

  const handleAuthSuccess = (token: string, id: string, name: string) => {
    setUserToken(token);
    setUserId(id);
    setUsername(name);
    setIsAuthenticated(true);

    // Store in session storage for persistence
    sessionStorage.setItem("plex_token", token);
    sessionStorage.setItem("plex_user_id", id);
    sessionStorage.setItem("plex_username", name);
  };

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps((prev) => {
      if (!prev.includes(stepId)) {
        return [...prev, stepId];
      }
      return prev;
    });
  };

  const handleStepNavigation = (stepId: string) => {
    // Only allow navigation to completed steps or the next logical step
    const allowedSteps = ["model", ...completedSteps];

    if (allowedSteps.includes(stepId)) {
      setCurrentFlow(stepId as any);
      setIsProcessing(false);
      setError(null);

      // Handle specific step navigation
      if (
        stepId === "filtering" &&
        artistAnalysis &&
        completedSteps.includes("analyzing")
      ) {
        // If user clicks on filtering step and analysis is complete, run availability check
        checkArtistAvailability(artistAnalysis);
      }
    }
  };

  // Load Plex Data Function
  const loadPlexData = async (): Promise<void> => {
    setLoading(true);
    try {
      setPlexConfig({
        serverUrl: process.env.PLEX_SERVER_URL || "http://localhost:32400",
        token: process.env.PLEX_TOKEN || "",
      });

      const [historyRes, libraryRes] = await Promise.all([
        fetch("/api/plex/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userToken, userId }),
        }),
        fetch("/api/plex/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userToken }),
        }),
      ]);

      const history: PlexTrack[] = await historyRes.json();
      const libraryData = await libraryRes.json();

      const fullHistory = history || [];
      setListeningHistory(fullHistory);
      setTotalLibraryCount(
        libraryData.totalLibraryCount || libraryData.length || 0
      );
      setUserLibrary(libraryData.tracks || libraryData);

      // Mark data step as completed
      markStepCompleted("data");
    } catch (error) {
      console.error("Error loading Plex data:", error);
      setError("Failed to load music data. Please check your configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Analyze artists and get recommendations
  const analyzeArtistsAndRecommend = async (): Promise<void> => {
    setCurrentFlow("analyzing");
    setIsProcessing(true);

    try {
      let historyForAnalysis = listeningHistory;

      if (listeningHistory.length > 100) {
        const recentTracks = listeningHistory.slice(0, 50);
        const remainingTracks = listeningHistory.slice(50);
        const randomSample = remainingTracks
          .sort(() => Math.random() - 0.5)
          .slice(0, 50);

        historyForAnalysis = [...recentTracks, ...randomSample];
      }

      const response = await fetch("/api/ai/analyze-artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listeningHistory: historyForAnalysis,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const analysis = await response.json();

      if (analysis.error) {
        throw new Error(`Analysis error: ${analysis.error}`);
      }

      setArtistAnalysis(analysis);

      // Mark analyzing step as completed
      markStepCompleted("analyzing");

      // Automatically proceed to check availability
      //await checkArtistAvailability(analysis);

      console.log("Analysis completed, showing results to user");
    } catch (error) {
      console.error("Artist analysis error:", error);
      setError("Failed to analyze artists. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 4: Check artist/album availability in Plex
  const checkArtistAvailability = async (analysis: any): Promise<void> => {
    setCurrentFlow("filtering");
    setIsProcessing(true);

    try {
      console.log("Checking artist availability with user token...");

      const response = await fetch("/api/plex/search-artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendedArtists: analysis.recommendedArtists,
          recommendedAlbums: analysis.recommendedAlbums,
          userToken: userToken, // Add the user token here
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Search API error:", response.status, errorText);
        throw new Error(`Search failed: ${response.status}`);
      }

      const availability = await response.json();

      if (availability.error) {
        throw new Error(`Search error: ${availability.error}`);
      }

      console.log("Artist availability results:", {
        artists: availability.availableArtists,
        albums: availability.availableAlbums,
      });

      setArtistAvailability(availability.artistAvailability);
      setAlbumAvailability(availability.albumAvailability);

      // Mark filtering step as completed
      markStepCompleted("filtering");
    } catch (error) {
      console.error("Availability check error:", error);
      setError("Failed to check artist availability. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 5: Generate playlist from available artists
  const generatePlaylistFromArtists = async (): Promise<void> => {
    setCurrentFlow("generating");
    setIsProcessing(true);

    try {
      const result = await requestWithContinuation(
        "/api/ai/recommend",
        {
          musicProfile: artistAnalysis.musicProfile,
          artistAvailability,
          albumAvailability,
          playlistLength: 20,
          model: selectedModel,
        },
        {
          maxAttempts: 3,
          expectedLength: 20,
          isArray: true,
        }
      );

      if (result.success) {
        console.log(
          `Successfully generated playlist with ${result.attempts} attempts`
        );
        setRecommendations(Array.isArray(result.data) ? result.data : []);

        // Mark generating step as completed
        markStepCompleted("generating");

        setCurrentFlow("review");
      } else {
        console.error("Failed to generate complete playlist:", result.error);

        // Use partial results if available
        if (
          result.data &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          setRecommendations(result.data);
          markStepCompleted("generating");
          setCurrentFlow("review");

          // Show warning about incomplete playlist
          setError(
            `Playlist generated with ${result.data.length} songs (requested 20). Some responses were truncated.`
          );
        } else {
          throw new Error(result.error || "Failed to generate playlist");
        }
      }
    } catch (error) {
      console.error("Playlist generation error:", error);
      setError("Failed to generate playlist. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Create Playlist in Plex
  const createPlaylist = async (): Promise<void> => {
    setLoading(true);
    try {
      const matchedTracks = recommendations
        .map((rec) => {
          return userLibrary.find(
            (track) =>
              track.title.toLowerCase().includes(rec.title.toLowerCase()) &&
              track.grandparentTitle
                .toLowerCase()
                .includes(rec.artist.toLowerCase())
          );
        })
        .filter(Boolean) as PlexTrack[];

      const trackIds = matchedTracks.map((track) => track.ratingKey);

      const response = await fetch("/api/plex/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `AI Playlist ${new Date().toLocaleDateString()}`,
          trackIds,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Playlist created successfully!");
        setCurrentFlow("model"); // Reset to start
      } else {
        throw new Error(result.error || "Failed to create playlist");
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
      setError("Failed to create playlist in Plex. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Debug useEffect
  useEffect(() => {
    console.log("Current flow:", currentFlow);
    console.log("Artist availability:", artistAvailability);
    console.log("Album availability:", albumAvailability);
  }, [currentFlow, artistAvailability, albumAvailability]);

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-gray-800 shadow-xl border-b border-gray-700 flex-1 flex flex-col min-h-0">
          {/* Compact Header */}
          <div className="p-3 sm:p-4 border-b border-gray-700 flex-shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Music className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6" />
              AI Playlist Generator
            </h1>
          </div>

          {!isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <PlexAuth onAuthSuccess={handleAuthSuccess} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left Sidebar - Progress Bar (Responsive width) */}
              <div className="w-80 lg:w-1/4 xl:w-1/5 border-r border-gray-700 flex flex-col min-h-0">
                {/* Compact User Info */}
                <div className="p-3 sm:p-4 flex-shrink-0">
                  <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-200 block truncate">
                            {username}
                          </span>
                          <span className="text-xs text-gray-400">Online</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          sessionStorage.clear();
                          setIsAuthenticated(false);
                          setUserToken("");
                          setUserId("");
                          setUsername("");
                        }}
                        className="text-xs text-gray-400 hover:text-gray-200 flex-shrink-0"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compact Vertical Progress Bar - Scrollable */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3 sm:pb-4 min-h-0">
                  <ProgressBar
                    currentStep={currentFlow}
                    completedSteps={completedSteps}
                    onStepClick={handleStepNavigation}
                    isProcessing={isProcessing || loading}
                  />
                </div>
              </div>

              {/* Right Content Area (Responsive width) */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Compact Error Display - Fixed at top */}
                {error && (
                  <div className="flex-shrink-0 p-3 sm:p-4 pb-0">
                    <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                      <p className="text-sm text-red-200">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className="mt-2 text-xs text-red-400 hover:text-red-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Content - Scrollable */}
                <div className="flex-1 p-3 sm:p-4 lg:p-6">
                  {/* Step 1: Model Selection */}
                  {currentFlow === "model" && (
                    <div className="space-y-4 sm:space-y-4">
                      <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 mb-2 sm:mb-4">
                          Choose Your AI Model
                        </h2>
                        <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-4">
                          Select the AI model that will analyze your music and
                          create your playlist
                        </p>
                      </div>

                      <ModelSelector
                        selectedModel={selectedModel}
                        onModelChange={setSelectedModel}
                        className="mb-4 sm:mb-4"
                      />

                      {selectedModel && (
                        <div className="bg-gray-700 rounded-lg p-3 sm:p-4 border border-gray-600">
                          <h3 className="font-semibold text-gray-200 mb-2 text-sm sm:text-base">
                            Selected Model:
                          </h3>
                          <p className="text-sm sm:text-base text-gray-300">
                            {selectedModel}
                          </p>
                          {selectedModel.includes("deepseek") && (
                            <p className="text-xs sm:text-sm text-green-400 mt-1">
                              ⭐ Free model - No API costs
                            </p>
                          )}
                        </div>
                      )}

                      {!selectedModel && (
                        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 sm:p-4">
                          <p className="text-sm sm:text-base text-yellow-200">
                            Please select an AI model to continue
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Plex Data Loading - Compact Version */}
                  {currentFlow === "data" && (
                    <div className="space-y-4 sm:space-y-4">
                      {loading ? (
                        <div className="text-center py-6">
                          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-4 text-blue-400" />
                          <p className="text-sm sm:text-base text-gray-300">
                            Loading your music data...
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Compact Inline Stats with Header */}
                          <div className="bg-gray-700 rounded-lg border border-gray-600 p-3 sm:p-4">
                            {/* Header inside container */}
                            <div className="mb-3 sm:mb-4">
                              <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 mb-1">
                                Your Music Data
                              </h2>
                              <p className="text-sm sm:text-base text-gray-400">
                                Library and listening history overview
                              </p>
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-4">
                              {/* Listening History Stat */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-lg sm:text-xl font-bold text-blue-300">
                                    {listeningHistory.length.toLocaleString()}
                                  </p>
                                  <p className="text-xs sm:text-sm text-blue-400 truncate">
                                    Listening History
                                  </p>
                                </div>
                              </div>

                              {/* Library Stat */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-lg sm:text-xl font-bold text-green-300">
                                    {totalLibraryCount.toLocaleString()}
                                  </p>
                                  <p className="text-xs sm:text-sm text-green-400 truncate">
                                    Total Library
                                  </p>
                                </div>
                              </div>

                              {/* Status Indicator */}
                              <div className="flex items-center gap-2 ml-auto">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-xs sm:text-sm text-green-400">
                                  Data Loaded
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* History Display fills remaining vertical space */}
                          <div className="flex-1 min-h-0 overflow-auto">
                            <HistoryDisplay
                              history={listeningHistory}
                              userToken={userToken}
                              onFilteredCountChange={setFilteredHistoryCount}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 3: AI Artist Analysis */}
                  {currentFlow === "analyzing" && (
                    <div className="space-y-4 sm:space-y-4">
                      <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 mb-2 sm:mb-4">
                          Analyzing Your Music Taste
                        </h2>
                        <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-4">
                          AI is finding artists and albums similar to your
                          listening history
                        </p>
                      </div>

                      {isProcessing ? (
                        <div className="text-center py-6">
                          <Brain className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse mx-auto mb-4 text-purple-400" />
                          <p className="text-sm sm:text-base text-gray-300">
                            Analyzing your musical preferences...
                          </p>
                        </div>
                      ) : artistAnalysis && artistAnalysis.musicProfile ? (
                        <div className="space-y-4 sm:space-y-4">
                          <div className="bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-600">
                            <h3 className="font-semibold text-gray-200 mb-3 sm:mb-4 text-sm sm:text-base">
                              Your Musical Profile
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-4">
                              <div>
                                <h4 className="font-medium text-green-300 mb-2 text-sm sm:text-base">
                                  Primary Genres
                                </h4>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                  {artistAnalysis.musicProfile.primaryGenres?.map(
                                    (genre: string, index: number) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-green-900/30 text-green-200 rounded-full text-xs sm:text-sm"
                                      >
                                        {genre}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium text-blue-300 mb-2 text-sm sm:text-base">
                                  Moods
                                </h4>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                  {artistAnalysis.musicProfile.moods?.map(
                                    (mood: string, index: number) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-blue-900/30 text-blue-200 rounded-full text-xs sm:text-sm"
                                      >
                                        {mood}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium text-purple-300 mb-2 text-sm sm:text-base">
                                  Styles
                                </h4>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                  {artistAnalysis.musicProfile.styles?.map(
                                    (style: string, index: number) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-purple-900/30 text-purple-200 rounded-full text-xs sm:text-sm"
                                      >
                                        {style}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium text-orange-300 mb-2 text-sm sm:text-base">
                                  Energy & Era
                                </h4>
                                <p className="text-sm sm:text-base text-gray-300">
                                  Energy: {artistAnalysis.musicProfile.energy}
                                </p>
                                <p className="text-sm sm:text-base text-gray-300">
                                  Era: {artistAnalysis.musicProfile.era}
                                </p>
                              </div>
                            </div>

                            <div className="mb-4 sm:mb-4">
                              <h4 className="font-medium text-yellow-300 mb-2 text-sm sm:text-base">
                                Recommended Artists
                              </h4>
                              <div className="bg-gray-600 rounded-lg p-3 flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                                {artistAnalysis.recommendedArtists?.map(
                                  (artist: any) => (
                                    <span
                                      key={artist.name}
                                      className="flex items-center bg-yellow-700/70 hover:bg-yellow-700 text-yellow-100 text-xs sm:text-sm rounded-full py-1 px-3 select-none"
                                    >
                                      {artist.name}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedArtists =
                                            artistAnalysis.recommendedArtists.filter(
                                              (a: any) => a.name !== artist.name
                                            );
                                          setArtistAnalysis((prev: any) => ({
                                            ...prev,
                                            recommendedArtists: updatedArtists,
                                          }));
                                        }}
                                        className="ml-2 hover:text-red-400 transition-colors"
                                        aria-label={`Remove ${artist.name}`}
                                      >
                                        &times;
                                      </button>
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="text-red-400 mb-4">
                            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                            <p className="text-sm sm:text-base">
                              Analysis failed to complete
                            </p>
                          </div>
                          <button
                            onClick={analyzeArtistsAndRecommend}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
                          >
                            Try Again
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Artist Availability Results */}
                  {currentFlow === "filtering" && (
                    <div className="space-y-4 sm:space-y-4">
                      <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 mb-2 sm:mb-4">
                          Artist Availability Check
                        </h2>
                        <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-4">
                          Found artists and albums that match your taste
                        </p>
                      </div>

                      {isProcessing ? (
                        <div className="text-center py-6">
                          <Search className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-4 text-blue-400" />
                          <p className="text-sm sm:text-base text-gray-300">
                            Checking artist availability...
                          </p>
                        </div>
                      ) : artistAvailability && albumAvailability ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 border border-gray-600">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                <h3 className="font-semibold text-gray-200 text-sm sm:text-base">
                                  Available Artists
                                </h3>
                              </div>
                              <p className="text-lg sm:text-2xl font-bold text-green-300">
                                {
                                  artistAvailability.filter(
                                    (a: any) => a.available
                                  ).length
                                }
                              </p>
                              <p className="text-xs sm:text-sm text-gray-400">
                                out of {artistAvailability.length} recommended
                              </p>
                            </div>

                            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 border border-gray-600">
                              <div className="flex items-center gap-2 mb-2">
                                <Album className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                <h3 className="font-semibold text-gray-200 text-sm sm:text-base">
                                  Available Albums
                                </h3>
                              </div>
                              <p className="text-lg sm:text-2xl font-bold text-blue-300">
                                {
                                  albumAvailability.filter(
                                    (a: any) => a.available
                                  ).length
                                }
                              </p>
                              <p className="text-xs sm:text-sm text-gray-400">
                                out of {albumAvailability.length} recommended
                              </p>
                            </div>
                          </div>

                          {/* Available Artists Preview */}
                          <div className="bg-gray-700 rounded-lg p-3 sm:p-4 border border-gray-600">
                            <h4 className="font-medium text-green-300 mb-2 text-sm sm:text-base">
                              Available Artists in Your Library
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {artistAvailability
                                .filter((a: any) => a.available)
                                .slice(0, 10)
                                .map((artist: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2 p-2 bg-gray-600 rounded"
                                  >
                                    <span className="text-green-400">✓</span>
                                    <span className="text-gray-200 text-xs sm:text-sm">
                                      {artist.name}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Step 5: AI Playlist Generation */}
                  {currentFlow === "generating" && (
                    <div className="space-y-4 sm:space-y-4">
                      <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 mb-2 sm:mb-4">
                          Creating Your Playlist
                        </h2>
                        <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-4">
                          AI is selecting the perfect tracks from your available
                          artists
                        </p>
                      </div>

                      {isProcessing ? (
                        <div className="text-center py-6">
                          <Music className="w-6 h-6 sm:w-8 sm:h-8 animate-bounce mx-auto mb-4 text-green-400" />
                          <p className="text-sm sm:text-base text-gray-300">
                            Generating your personalized playlist...
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Step 6: Playlist Review */}
                  {currentFlow === "review" && recommendations.length > 0 && (
                    <div className="space-y-4 sm:space-y-4">
                      <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 mb-2 sm:mb-4">
                          Your AI-Generated Playlist
                        </h2>
                        <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-4">
                          Review and edit your playlist, then create it in Plex
                        </p>
                      </div>

                      <PlaylistEditor
                        playlist={recommendations}
                        userToken={userToken}
                        onPlaylistUpdate={handlePlaylistUpdate}
                        onRegenerateTrack={handleRegenerateTrack}
                        onRegeneratePlaylist={handleRegeneratePlaylist}
                        onRegenerateInvalidTracks={
                          handleRegenerateInvalidTracks
                        }
                        isGenerating={isProcessing || isRegenerating}
                      />
                    </div>
                  )}
                </div>

                {/* Compact Fixed Bottom Navigation */}
                <div className="flex-shrink-0 p-3 sm:p-4 lg:p-6 border-t border-gray-700">
                  {/* Navigation buttons for each step */}
                  {currentFlow === "model" && (
                    <button
                      onClick={() => {
                        markStepCompleted("model");
                        setCurrentFlow("data");
                        loadPlexData();
                      }}
                      disabled={!selectedModel}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                      {selectedModel
                        ? `Continue with ${
                            selectedModel.split("/")[1] || "Selected Model"
                          }`
                        : "Select a model to continue"}
                    </button>
                  )}

                  {currentFlow === "data" && !loading && (
                    <div className="flex gap-2 sm:gap-4">
                      <button
                        onClick={() => setCurrentFlow("model")}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                      >
                        Back to Model
                      </button>
                      <button
                        onClick={() => analyzeArtistsAndRecommend()}
                        disabled={listeningHistory.length === 0}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                      >
                        Analyze (
                        {filteredHistoryCount || listeningHistory.length})
                      </button>
                    </div>
                  )}

                  {currentFlow === "analyzing" &&
                    !isProcessing &&
                    artistAnalysis && (
                      <div className="flex gap-2 sm:gap-4">
                        <button
                          onClick={() => setCurrentFlow("data")}
                          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                        >
                          Back to Data
                        </button>
                        <button
                          onClick={() =>
                            checkArtistAvailability(artistAnalysis)
                          }
                          disabled={isProcessing}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                        >
                          Find Artists
                        </button>
                      </div>
                    )}

                  {currentFlow === "filtering" &&
                    !isProcessing &&
                    artistAvailability && (
                      <div className="flex gap-2 sm:gap-4">
                        <button
                          onClick={() => setCurrentFlow("data")}
                          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                        >
                          Back to Data
                        </button>
                        <button
                          onClick={generatePlaylistFromArtists}
                          disabled={
                            !artistAvailability.some((a: any) => a.available)
                          }
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                        >
                          Generate Playlist
                        </button>
                      </div>
                    )}

                  {currentFlow === "review" && recommendations.length > 0 && (
                    <div className="flex gap-2 sm:gap-4">
                      <button
                        onClick={() => setCurrentFlow("filtering")}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                      >
                        Back to Artists
                      </button>
                      <button
                        onClick={createPlaylist}
                        disabled={loading || recommendations.length === 0}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                      >
                        {loading
                          ? "Creating..."
                          : `Create Playlist (${recommendations.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default PlaylistGenerator;
