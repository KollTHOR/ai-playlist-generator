/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Music,
  Clock,
  Loader2,
  Trash2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  Search,
} from "lucide-react";
import { AIRecommendation } from "@/types";

interface PlaylistEditorProps {
  playlist: AIRecommendation[];
  userToken: string;
  onPlaylistUpdate: (updatedPlaylist: AIRecommendation[]) => void;
  onRegenerateTrack: (index: number) => void;
  onRegeneratePlaylist: () => void;
  onRegenerateInvalidTracks: (invalidIndices: number[]) => void; // Add this line
  isGenerating?: boolean;
}

interface TrackValidation {
  isValid: boolean;
  isChecking: boolean;
  plexData?: any;
  error?: string;
}

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({
  playlist,
  userToken,
  onPlaylistUpdate,
  onRegenerateTrack,
  onRegeneratePlaylist,
  onRegenerateInvalidTracks,
  isGenerating = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  const [pageChanging, setPageChanging] = useState(false);
  const [trackValidation, setTrackValidation] = useState<
    Record<string, TrackValidation>
  >({});
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  // Calculate pagination
  const totalPages = Math.ceil(playlist.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = playlist.slice(startIndex, endIndex);

  // Reset states when playlist changes
  useEffect(() => {
    setCurrentPage(1);
    setImageErrors({});
    setImageLoading({});
    setTrackValidation({});
    setShowValidationSummary(false);
  }, [playlist]);

  // Validate a single track against Plex library
  const validateTrack = async (
    track: AIRecommendation,
    index: number
  ): Promise<TrackValidation> => {
    const trackKey = `${track.artist}-${track.title}-${index}`;

    try {
      const response = await fetch("/api/plex/validate-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userToken,
          artist: track.artist,
          title: track.title,
          album: track.album,
        }),
      });

      const result = await response.json();

      if (result.found) {
        return {
          isValid: true,
          isChecking: false,
          plexData: result.trackData,
        };
      } else {
        return {
          isValid: false,
          isChecking: false,
          error: result.error || "Track not found in library",
        };
      }
    } catch (error) {
      return {
        isValid: false,
        isChecking: false,
        error: "Failed to validate track",
      };
    }
  };

  // Validate all tracks in the playlist
  const validateAllTracks = async () => {
    setIsValidating(true);
    setShowValidationSummary(false);

    // Initialize validation state for all tracks
    const initialValidation: Record<string, TrackValidation> = {};
    playlist.forEach((track, index) => {
      const trackKey = `${track.artist}-${track.title}-${index}`;
      initialValidation[trackKey] = {
        isValid: false,
        isChecking: true,
      };
    });
    setTrackValidation(initialValidation);

    // Validate tracks in batches to avoid overwhelming the API
    const batchSize = 5;
    const updatedValidation: Record<string, TrackValidation> = {};

    for (let i = 0; i < playlist.length; i += batchSize) {
      const batch = playlist.slice(i, i + batchSize);

      const batchPromises = batch.map(async (track, batchIndex) => {
        const actualIndex = i + batchIndex;
        const trackKey = `${track.artist}-${track.title}-${actualIndex}`;
        const validation = await validateTrack(track, actualIndex);
        return { trackKey, validation };
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(({ trackKey, validation }) => {
        updatedValidation[trackKey] = validation;
      });

      // Update state with current batch results
      setTrackValidation((prev) => ({
        ...prev,
        ...updatedValidation,
      }));
    }

    setIsValidating(false);
    setShowValidationSummary(true);
  };

  // Get validation summary
  const getValidationSummary = () => {
    const validTracks = Object.values(trackValidation).filter(
      (v) => v.isValid
    ).length;
    const invalidTracks = Object.values(trackValidation).filter(
      (v) => v.isValid === false && !v.isChecking
    ).length;
    const totalValidated = validTracks + invalidTracks;

    return {
      validTracks,
      invalidTracks,
      totalValidated,
      totalTracks: playlist.length,
    };
  };

  // Remove all invalid tracks
  const removeInvalidTracks = () => {
    const validPlaylist = playlist.filter((track, index) => {
      const trackKey = `${track.artist}-${track.title}-${index}`;
      const validation = trackValidation[trackKey];
      return validation?.isValid === true;
    });

    onPlaylistUpdate(validPlaylist);
  };

  // Handle page change with loading state
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;

    setPageChanging(true);
    setCurrentPage(newPage);

    // Clear previous image states
    setImageErrors({});
    setImageLoading({});

    // Set loading state for new page items
    const newStartIndex = (newPage - 1) * itemsPerPage;
    const newEndIndex = newStartIndex + itemsPerPage;
    const newItems = playlist.slice(newStartIndex, newEndIndex);

    const newLoadingState: Record<string, boolean> = {};
    newItems.forEach((track, index) => {
      newLoadingState[
        `${track.artist}-${track.title}-${newStartIndex + index}`
      ] = true;
    });
    setImageLoading(newLoadingState);

    setTimeout(() => {
      setPageChanging(false);
    }, 100);
  };

  // Get album artwork URL
  const getAlbumArtUrl = (track: AIRecommendation): string => {
    return "/api/plex/image?path=placeholder";
  };

  // Handle image load success
  const handleImageLoad = (trackKey: string) => {
    setImageLoading((prev) => ({
      ...prev,
      [trackKey]: false,
    }));
  };

  // Handle image errors
  const handleImageError = (trackKey: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [trackKey]: true,
    }));
    setImageLoading((prev) => ({
      ...prev,
      [trackKey]: false,
    }));
  };

  // Remove track from playlist
  const removeTrack = (index: number) => {
    const actualIndex = startIndex + index;
    const updatedPlaylist = playlist.filter((_, i) => i !== actualIndex);
    onPlaylistUpdate(updatedPlaylist);
  };

  // Move track up
  const moveTrackUp = (index: number) => {
    const actualIndex = startIndex + index;
    if (actualIndex === 0) return;

    const updatedPlaylist = [...playlist];
    [updatedPlaylist[actualIndex - 1], updatedPlaylist[actualIndex]] = [
      updatedPlaylist[actualIndex],
      updatedPlaylist[actualIndex - 1],
    ];

    onPlaylistUpdate(updatedPlaylist);
  };

  // Move track down
  const moveTrackDown = (index: number) => {
    const actualIndex = startIndex + index;
    if (actualIndex === playlist.length - 1) return;

    const updatedPlaylist = [...playlist];
    [updatedPlaylist[actualIndex], updatedPlaylist[actualIndex + 1]] = [
      updatedPlaylist[actualIndex + 1],
      updatedPlaylist[actualIndex],
    ];

    onPlaylistUpdate(updatedPlaylist);
  };

  // Generate page numbers for pagination
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const getInvalidTrackIndices = (): number[] => {
    return playlist
      .map((track, index) => {
        const trackKey = `${track.artist}-${track.title}-${index}`;
        const validation = trackValidation[trackKey];
        return validation?.isValid === false ? index : -1;
      })
      .filter((index) => index !== -1);
  };

  const handleRegenerateInvalidClick = () => {
    const invalidIndices = getInvalidTrackIndices();
    onRegenerateInvalidTracks(invalidIndices);
  };

  const validationSummary = getValidationSummary();

  return (
    <div className="bg-gray-700 rounded-lg border border-gray-600 mb-4">
      {/* Header */}
      <div className="p-4 border-b border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-200">Playlist Editor</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={validateAllTracks}
              disabled={isValidating}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              {isValidating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isValidating ? "Validating..." : "Validate Library"}
            </button>
            <button
              onClick={onRegeneratePlaylist}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isGenerating ? "Regenerating..." : "Regenerate Playlist"}
            </button>
          </div>
        </div>

        {/* Validation Summary */}
        {showValidationSummary && (
          <div className="mb-4 p-3 bg-gray-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>{validationSummary.validTracks} valid</span>
                </div>
                <div className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{validationSummary.invalidTracks} invalid</span>
                </div>
                <div className="text-gray-400">
                  ({validationSummary.totalValidated}/
                  {validationSummary.totalTracks} checked)
                </div>
              </div>
              {validationSummary.invalidTracks > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegenerateInvalidClick}
                    disabled={isGenerating}
                    className="flex items-center gap-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Regenerate Invalid
                  </button>
                  <button
                    onClick={removeInvalidTracks}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                  >
                    Remove Invalid
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Music className="w-4 h-4" />
            <span>{playlist.length} tracks</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>~{Math.round(playlist.length * 3.5)} minutes</span>
          </div>
        </div>
      </div>

      {/* Playlist List */}
      <div className="max-h-96 overflow-y-auto">
        {currentItems.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tracks in playlist.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-600">
            {currentItems.map((track, index) => {
              const actualIndex = startIndex + index;
              const trackKey = `${track.artist}-${track.title}-${actualIndex}`;
              const validation = trackValidation[trackKey];

              return (
                <div
                  key={trackKey}
                  className={`p-4 hover:bg-gray-600 transition-colors ${
                    pageChanging ? "opacity-70" : "opacity-100"
                  } ${validation?.isValid === false ? "bg-red-900/20" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Track Number */}
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className="text-sm text-gray-400">
                        {actualIndex + 1}
                      </span>
                    </div>

                    {/* Validation Status */}
                    <div className="flex-shrink-0 w-6">
                      {validation?.isChecking ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : validation?.isValid === true ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : validation?.isValid === false ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : null}
                    </div>

                    {/* Album Artwork */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-600 relative">
                        {!imageErrors[trackKey] ? (
                          <>
                            <Image
                              src={getAlbumArtUrl(track)}
                              alt={`${track.album} album art`}
                              width={48}
                              height={48}
                              className={`w-full h-full object-cover transition-opacity duration-300 ${
                                imageLoading[trackKey]
                                  ? "opacity-0"
                                  : "opacity-100"
                              }`}
                              onError={() => handleImageError(trackKey)}
                              onLoad={() => handleImageLoad(trackKey)}
                              unoptimized
                            />
                            {imageLoading[trackKey] && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-600">
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-medium truncate ${
                              validation?.isValid === false
                                ? "text-red-300"
                                : "text-gray-100"
                            }`}
                          >
                            {track.title}
                          </p>
                          <p
                            className={`text-sm truncate ${
                              validation?.isValid === false
                                ? "text-red-400"
                                : "text-gray-300"
                            }`}
                          >
                            {track.artist}
                          </p>
                          <p
                            className={`text-xs truncate ${
                              validation?.isValid === false
                                ? "text-red-500"
                                : "text-gray-400"
                            }`}
                          >
                            {track.album}
                          </p>
                          {track.reason && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {track.reason}
                            </p>
                          )}
                          {validation?.error && (
                            <p className="text-xs text-red-400 truncate mt-1">
                              {validation.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Move Up */}
                      <button
                        onClick={() => moveTrackUp(index)}
                        disabled={actualIndex === 0}
                        className="p-1 rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-gray-200 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => moveTrackDown(index)}
                        disabled={actualIndex === playlist.length - 1}
                        className="p-1 rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-gray-200 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Replace Track */}
                      <button
                        onClick={() => onRegenerateTrack(actualIndex)}
                        className="p-1 rounded hover:bg-gray-500 text-blue-400 hover:text-blue-200 transition-colors"
                        title="Replace track"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      {/* Remove Track */}
                      <button
                        onClick={() => removeTrack(index)}
                        className="p-1 rounded hover:bg-gray-500 text-red-400 hover:text-red-200 transition-colors"
                        title="Remove track"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, playlist.length)} of{" "}
              {playlist.length} tracks
            </div>

            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || pageChanging}
                className="p-2 rounded-lg bg-gray-600 text-gray-200 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  <div key={index}>
                    {page === -1 ? (
                      <span className="px-2 py-1 text-gray-400">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page)}
                        disabled={pageChanging}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-gray-600 text-gray-200 hover:bg-gray-500"
                        }`}
                      >
                        {page}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || pageChanging}
                className="p-2 rounded-lg bg-gray-600 text-gray-200 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistEditor;
