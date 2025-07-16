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
} from "lucide-react";
import ModelSelector from "./ModelSelector";
import { PlexTrack, AIRecommendation } from "@/types";
import HistoryDisplay from "./HistoryDisplay";
import ProgressBar from "./ProgressBar";
import PlexAuth from "./PlexAuth";

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

  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

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
      await checkArtistAvailability(analysis);
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
      const response = await fetch("/api/plex/search-artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendedArtists: analysis.recommendedArtists,
          recommendedAlbums: analysis.recommendedAlbums,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const availability = await response.json();

      if (availability.error) {
        throw new Error(`Search error: ${availability.error}`);
      }

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
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicProfile: artistAnalysis.musicProfile,
          artistAvailability,
          albumAvailability,
          playlistLength: 20,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Playlist generation failed: ${response.status}`);
      }

      const playlist = await response.json();

      if (playlist.error) {
        throw new Error(`Playlist error: ${playlist.error}`);
      }

      setRecommendations(Array.isArray(playlist) ? playlist : []);

      // Mark generating step as completed
      markStepCompleted("generating");

      setCurrentFlow("review");
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
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto p-6">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
          <h1 className="text-3xl font-bold text-gray-100 mb-6 flex items-center gap-2">
            <Music className="text-blue-400" />
            AI Playlist Generator
          </h1>

          {!isAuthenticated ? (
            <PlexAuth onAuthSuccess={handleAuthSuccess} />
          ) : (
            <>
              {/* User info display */}
              <div className="bg-gray-700 rounded-lg p-4 mb-6 border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-green-400" />
                    <span className="text-gray-200">
                      Signed in as {username}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      sessionStorage.clear();
                      setIsAuthenticated(false);
                      setUserToken("");
                      setUserId("");
                      setUsername("");
                    }}
                    className="text-sm text-gray-400 hover:text-gray-200"
                  >
                    Sign out
                  </button>
                </div>
              </div>

              {/* Your existing progress bar and content */}
              <ProgressBar
                currentStep={currentFlow}
                completedSteps={completedSteps}
                onStepClick={handleStepNavigation}
                isProcessing={isProcessing || loading}
              />

              {/* Error Display */}
              {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-4">
                  <p className="text-red-200">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-sm text-red-400 hover:text-red-200"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Step 1: Model Selection */}
              {currentFlow === "model" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-100 mb-4">
                      Choose Your AI Model
                    </h2>
                    <p className="text-gray-400 mb-6">
                      Select the AI model that will analyze your music and
                      create your playlist
                    </p>
                  </div>

                  <ModelSelector
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    className="mb-6"
                  />

                  {selectedModel && (
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h3 className="font-semibold text-gray-200 mb-2">
                        Selected Model:
                      </h3>
                      <p className="text-gray-300">{selectedModel}</p>
                      {selectedModel.includes("deepseek") && (
                        <p className="text-sm text-green-400 mt-1">
                          ⭐ Free model - No API costs
                        </p>
                      )}
                    </div>
                  )}

                  {!selectedModel && (
                    <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                      <p className="text-yellow-200">
                        Please select an AI model to continue
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      markStepCompleted("model");
                      setCurrentFlow("data");
                      loadPlexData();
                    }}
                    disabled={!selectedModel}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    {selectedModel
                      ? `Continue with ${
                          selectedModel.split("/")[1] || "Selected Model"
                        }`
                      : "Select a model to continue"}
                  </button>
                </div>
              )}

              {/* Step 2: Plex Data Loading */}
              {currentFlow === "data" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-100 mb-4">
                      Loading Your Music Data
                    </h2>
                    <p className="text-gray-400 mb-6">
                      Fetching your listening history and library information
                    </p>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
                      <p className="text-gray-300">
                        Loading your music data...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg">
                          <h3 className="font-semibold text-blue-200">
                            Total Listening History
                          </h3>
                          <p className="text-2xl font-bold text-blue-300">
                            {listeningHistory.length.toLocaleString()}
                          </p>
                          <p className="text-sm text-blue-400">
                            {listeningHistory.length === 1 ? "track" : "tracks"}{" "}
                            available
                          </p>
                        </div>

                        <div className="bg-green-900/30 border border-green-700 p-4 rounded-lg">
                          <h3 className="font-semibold text-green-200">
                            Your Library
                          </h3>
                          <p className="text-2xl font-bold text-green-300">
                            {totalLibraryCount.toLocaleString()}
                          </p>
                          <p className="text-sm text-green-400">total tracks</p>
                        </div>
                      </div>

                      {/* History Display - Open by Default */}
                      <HistoryDisplay
                        history={listeningHistory}
                        plexServerUrl={plexConfig.serverUrl}
                        plexToken={plexConfig.token}
                      />

                      <div className="flex gap-4">
                        <button
                          onClick={() => setCurrentFlow("model")}
                          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          Back to Model Selection
                        </button>
                        <button
                          onClick={analyzeArtistsAndRecommend}
                          disabled={listeningHistory.length === 0}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          Analyze My Music Taste ({listeningHistory.length}{" "}
                          tracks)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: AI Artist Analysis */}
              {currentFlow === "analyzing" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-100 mb-4">
                      Analyzing Your Music Taste
                    </h2>
                    <p className="text-gray-400 mb-6">
                      AI is finding artists and albums similar to your listening
                      history
                    </p>
                  </div>

                  {isProcessing ? (
                    <div className="text-center py-8">
                      <Brain className="w-8 h-8 animate-pulse mx-auto mb-4 text-purple-400" />
                      <p className="text-gray-300">
                        Analyzing your musical preferences...
                      </p>
                    </div>
                  ) : artistAnalysis && artistAnalysis.musicProfile ? (
                    <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                      <h3 className="font-semibold text-gray-200 mb-4">
                        Your Musical Profile
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <h4 className="font-medium text-green-300 mb-2">
                            Primary Genres
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {artistAnalysis.musicProfile.primaryGenres?.map(
                              (genre: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-green-900/30 text-green-200 rounded-full text-sm"
                                >
                                  {genre}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-blue-300 mb-2">
                            Moods
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {artistAnalysis.musicProfile.moods?.map(
                              (mood: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-900/30 text-blue-200 rounded-full text-sm"
                                >
                                  {mood}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-purple-300 mb-2">
                            Styles
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {artistAnalysis.musicProfile.styles?.map(
                              (style: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-purple-900/30 text-purple-200 rounded-full text-sm"
                                >
                                  {style}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-orange-300 mb-2">
                            Energy & Era
                          </h4>
                          <p className="text-gray-300">
                            Energy: {artistAnalysis.musicProfile.energy}
                          </p>
                          <p className="text-gray-300">
                            Era: {artistAnalysis.musicProfile.era}
                          </p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="font-medium text-yellow-300 mb-2">
                          Recommended Artists Preview
                        </h4>
                        <div className="bg-gray-600 rounded-lg p-3">
                          <p className="text-sm text-gray-300">
                            {artistAnalysis.recommendedArtists
                              ?.slice(0, 8)
                              .map((artist: any) => artist.name)
                              .join(", ")}
                            {artistAnalysis.recommendedArtists?.length > 8 &&
                              "..."}
                          </p>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400">
                          Checking artist availability in your library...
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Step 4: Artist Availability Results */}
              {currentFlow === "filtering" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-100 mb-4">
                      Artist Availability Check
                    </h2>
                    <p className="text-gray-400 mb-6">
                      Found artists and albums that match your taste
                    </p>
                  </div>

                  {isProcessing ? (
                    <div className="text-center py-8">
                      <Search className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
                      <p className="text-gray-300">
                        Checking artist availability...
                      </p>
                    </div>
                  ) : artistAvailability && albumAvailability ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-green-400" />
                            <h3 className="font-semibold text-gray-200">
                              Available Artists
                            </h3>
                          </div>
                          <p className="text-2xl font-bold text-green-300">
                            {
                              artistAvailability.filter((a: any) => a.available)
                                .length
                            }
                          </p>
                          <p className="text-sm text-gray-400">
                            out of {artistAvailability.length} recommended
                          </p>
                        </div>

                        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                          <div className="flex items-center gap-2 mb-2">
                            <Album className="w-5 h-5 text-blue-400" />
                            <h3 className="font-semibold text-gray-200">
                              Available Albums
                            </h3>
                          </div>
                          <p className="text-2xl font-bold text-blue-300">
                            {
                              albumAvailability.filter((a: any) => a.available)
                                .length
                            }
                          </p>
                          <p className="text-sm text-gray-400">
                            out of {albumAvailability.length} recommended
                          </p>
                        </div>
                      </div>

                      {/* Available Artists Preview */}
                      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <h4 className="font-medium text-green-300 mb-2">
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
                                <span className="text-gray-200 text-sm">
                                  {artist.name}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={() => setCurrentFlow("data")}
                          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          Back to Data
                        </button>
                        <button
                          onClick={generatePlaylistFromArtists}
                          disabled={
                            !artistAvailability.some((a: any) => a.available)
                          }
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          Generate Playlist from Artists
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Step 5: AI Playlist Generation */}
              {currentFlow === "generating" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-100 mb-4">
                      Creating Your Playlist
                    </h2>
                    <p className="text-gray-400 mb-6">
                      AI is selecting the perfect tracks from your available
                      artists
                    </p>
                  </div>

                  {isProcessing ? (
                    <div className="text-center py-8">
                      <Music className="w-8 h-8 animate-bounce mx-auto mb-4 text-green-400" />
                      <p className="text-gray-300">
                        Generating your personalized playlist...
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Step 6: Playlist Review */}
              {currentFlow === "review" && recommendations.length > 0 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-100 mb-4">
                      Your AI-Generated Playlist
                    </h2>
                    <p className="text-gray-400 mb-6">
                      Review your playlist and create it in Plex
                    </p>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-600">
                    <ol className="space-y-2">
                      {recommendations.map((track, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600 hover:bg-gray-750 transition-colors"
                        >
                          <span className="text-sm text-gray-400 w-8">
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-100">
                              {track.title}
                            </p>
                            <p className="text-sm text-gray-300">
                              {track.artist}
                            </p>
                            {track.album && (
                              <p className="text-xs text-gray-500">
                                {track.album}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setCurrentFlow("filtering")}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Back to Artists
                    </button>
                    <button
                      onClick={createPlaylist}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      {loading ? "Creating..." : "Create Playlist in Plex"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default PlaylistGenerator;
