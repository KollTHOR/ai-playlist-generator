import { useState } from "react";
import {
  PlexTrack,
  AIRecommendation,
  MusicProfile,
  TrackAvailability,
} from "@/types";
import { useToast } from "@/lib/ToastContext";

export type PlaylistFlow =
  | "model"
  | "data"
  | "analyzing"
  | "searching"
  | "generating"
  | "review";

export const usePlaylistGenerator = (userToken: string, userId: string) => {
  // Core state
  const [currentFlow, setCurrentFlow] = useState<PlaylistFlow>("model");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [listeningHistory, setListeningHistory] = useState<PlexTrack[]>([]);
  const [userLibrary, setUserLibrary] = useState<PlexTrack[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(
    []
  );
  const [totalLibraryCount, setTotalLibraryCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [filteredHistoryCount, setFilteredHistoryCount] = useState<number>(0);

  // Track-based recommendation states
  const [musicProfile, setMusicProfile] = useState<MusicProfile | null>(null);
  const [trackAvailability, setTrackAvailability] =
    useState<TrackAvailability | null>(null);

  const { showError, showSuccess } = useToast();

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps((prev) => {
      if (!prev.includes(stepId)) {
        return [...prev, stepId];
      }
      return prev;
    });
  };

  const handleStepNavigation = (stepId: string) => {
    const allowedSteps = ["model", ...completedSteps];
    if (allowedSteps.includes(stepId)) {
      setCurrentFlow(stepId as PlaylistFlow);
      setIsProcessing(false);
    }
  };

  // Load Plex data
  const loadPlexData = async (): Promise<void> => {
    setLoading(true);
    try {
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

      setListeningHistory(history || []);
      setTotalLibraryCount(
        libraryData.totalLibraryCount || libraryData.length || 0
      );
      setUserLibrary(libraryData.tracks || libraryData);

      markStepCompleted("data");
    } catch (error) {
      console.error("Error loading Plex data:", error);
      showError("Failed to load music data. Please check your configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Analyze music and get track recommendations
  const analyzeMusic = async (): Promise<void> => {
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

      const response = await fetch("/api/ai/analyze-tracks", {
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

      setMusicProfile(analysis.musicProfile);
      markStepCompleted("analyzing");

      console.log("Track analysis completed");
    } catch (error) {
      console.error("Music analysis error:", error);
      showError("Failed to analyze music taste. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Search for tracks in Plex library
  const searchTracks = async (): Promise<void> => {
    setCurrentFlow("searching");
    setIsProcessing(true);

    try {
      // First get track recommendations from AI
      const trackRecommendationsResponse = await fetch(
        "/api/ai/get-track-recommendations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            musicProfile,
            model: selectedModel,
          }),
        }
      );

      const trackRecommendations = await trackRecommendationsResponse.json();

      // Then search for these tracks in Plex
      const searchResponse = await fetch("/api/plex/search-tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendedTracks: trackRecommendations,
          userToken: userToken,
        }),
      });

      const searchResult = await searchResponse.json();
      setTrackAvailability(searchResult);
      markStepCompleted("searching");

      console.log("Track search completed");
    } catch (error) {
      console.error("Track search error:", error);
      showError("Failed to search for tracks. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate final playlist
  const generatePlaylist = async (): Promise<void> => {
    setCurrentFlow("generating");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicProfile,
          trackAvailability: trackAvailability,
          playlistLength: 20,
          model: selectedModel,
        }),
      });

      const playlist = await response.json();
      setRecommendations(playlist);
      markStepCompleted("generating");
      setCurrentFlow("review");

      console.log("Playlist generated successfully");
    } catch (error) {
      console.error("Playlist generation error:", error);
      showError("Failed to generate playlist. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Create playlist in Plex
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
          userToken,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess("Playlist created successfully!");
        setCurrentFlow("model");
      } else {
        throw new Error(result.error || "Failed to create playlist");
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
      showError("Failed to create playlist in Plex. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
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
    setFilteredHistoryCount,
    loadPlexData,
    analyzeMusic,
    searchTracks,
    generatePlaylist,
    createPlaylist,
    markStepCompleted,
    handleStepNavigation,
  };
};
