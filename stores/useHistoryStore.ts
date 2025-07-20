// stores/useHistoryStore.ts
import { create } from "zustand";
import { PlexTrack } from "@/types";

interface TrackFrequency {
  track: PlexTrack;
  playCount: number;
  lastPlayed: Date;
  firstPlayed: Date;
}

interface CategoryAnalysis {
  artists: Map<string, { playCount: number; tracks: TrackFrequency[] }>;
  albums: Map<string, { playCount: number; tracks: TrackFrequency[] }>;
}

interface HistoryStore {
  selectedTimeFrame: string;
  rawHistory: PlexTrack[];
  filteredHistory: PlexTrack[];
  frequencyAnalysis: TrackFrequency[];
  categoryAnalysis: CategoryAnalysis;

  // Actions
  setSelectedTimeFrame: (timeFrame: string) => void;
  setRawHistory: (history: PlexTrack[]) => void;
  filterHistoryByTimeFrame: () => void;
  generateFrequencyAnalysis: () => void;
  generateCategoryAnalysis: () => void;
  getTopTracks: (limit?: number) => TrackFrequency[];
  getWeightedSelection: (limit?: number) => PlexTrack[];
  getRecentVarietyTracks: (limit?: number) => PlexTrack[];
  getRandomSample: (limit?: number) => PlexTrack[];
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  selectedTimeFrame: "all",
  rawHistory: [],
  filteredHistory: [],
  frequencyAnalysis: [],
  categoryAnalysis: {
    artists: new Map(),
    albums: new Map(),
  },

  setSelectedTimeFrame: (timeFrame: string) => {
    set({ selectedTimeFrame: timeFrame });
    get().filterHistoryByTimeFrame();
  },

  setRawHistory: (history: PlexTrack[]) => {
    set({ rawHistory: history });
    get().filterHistoryByTimeFrame();
  },

  filterHistoryByTimeFrame: () => {
    const { rawHistory, selectedTimeFrame } = get();

    if (selectedTimeFrame === "all") {
      set({ filteredHistory: rawHistory });
      get().generateFrequencyAnalysis();
      return;
    }

    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedTimeFrame) {
      case "day":
        cutoffDate.setTime(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filtered = rawHistory.filter((track) => {
      if (!track.viewedAt) return false;
      const trackDate = new Date(track.viewedAt * 1000);
      return trackDate >= cutoffDate;
    });

    set({ filteredHistory: filtered });
    get().generateFrequencyAnalysis();
  },

  generateFrequencyAnalysis: () => {
    const { filteredHistory } = get();

    // Create a map to track unique tracks and their play counts
    const trackMap = new Map<string, TrackFrequency>();

    filteredHistory.forEach((track) => {
      // Create a unique key based on artist, album, and title
      const key = `${track.grandparentTitle || "Unknown"}-${
        track.parentTitle || "Unknown"
      }-${track.title || "Unknown"}`;
      const playDate = new Date((track.viewedAt || 0) * 1000);

      if (trackMap.has(key)) {
        const existing = trackMap.get(key)!;
        existing.playCount += 1;
        existing.lastPlayed =
          playDate > existing.lastPlayed ? playDate : existing.lastPlayed;
        existing.firstPlayed =
          playDate < existing.firstPlayed ? playDate : existing.firstPlayed;
      } else {
        trackMap.set(key, {
          track,
          playCount: 1,
          lastPlayed: playDate,
          firstPlayed: playDate,
        });
      }
    });

    // Convert to array and sort by play count (descending)
    const frequencyArray = Array.from(trackMap.values()).sort((a, b) => {
      // Primary sort: play count (descending)
      if (b.playCount !== a.playCount) {
        return b.playCount - a.playCount;
      }
      // Secondary sort: last played (most recent first)
      return b.lastPlayed.getTime() - a.lastPlayed.getTime();
    });

    set({ frequencyAnalysis: frequencyArray });
    get().generateCategoryAnalysis();
  },

  generateCategoryAnalysis: () => {
    const { frequencyAnalysis } = get();

    const analysis: CategoryAnalysis = {
      artists: new Map(),
      albums: new Map(),
    };

    frequencyAnalysis.forEach((freq) => {
      const { track } = freq;

      // Artist analysis
      const artist = track.grandparentTitle || "Unknown Artist";
      if (!analysis.artists.has(artist)) {
        analysis.artists.set(artist, { playCount: 0, tracks: [] });
      }
      const artistData = analysis.artists.get(artist)!;
      artistData.playCount += freq.playCount;
      artistData.tracks.push(freq);

      // Album analysis
      const albumKey = `${artist} - ${track.parentTitle || "Unknown Album"}`;
      if (!analysis.albums.has(albumKey)) {
        analysis.albums.set(albumKey, { playCount: 0, tracks: [] });
      }
      const albumData = analysis.albums.get(albumKey)!;
      albumData.playCount += freq.playCount;
      albumData.tracks.push(freq);
    });

    set({ categoryAnalysis: analysis });
  },

  getTopTracks: (limit = 50) => {
    const { frequencyAnalysis } = get();
    return frequencyAnalysis.slice(0, limit);
  },

  getWeightedSelection: (limit = 100) => {
    const { frequencyAnalysis } = get();

    // Helper function to check if a date is recent (within last 30 days)
    const isRecent = (date: Date): boolean => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    };

    // Create weighted selection based on play count and recency
    const weighted = frequencyAnalysis.map((freq) => ({
      track: freq.track,
      frequency: freq,
      weight: freq.playCount + (isRecent(freq.lastPlayed) ? 3 : 0),
    }));

    // Sort by weight and take top selections
    return weighted
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map((item) => item.track);
  },

  getRecentVarietyTracks: (limit = 25) => {
    const { frequencyAnalysis } = get();

    return frequencyAnalysis
      .filter((freq) => freq.playCount < 10 && freq.playCount >= 2) // Moderately played tracks
      .sort((a, b) => b.lastPlayed.getTime() - a.lastPlayed.getTime()) // Sort by recency
      .slice(0, limit)
      .map((freq) => freq.track);
  },

  getRandomSample: (limit = 25) => {
    const { frequencyAnalysis } = get();

    const eligible = frequencyAnalysis.filter((freq) => freq.playCount >= 2); // At least 2 plays
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, limit).map((freq) => freq.track);
  },
}));
