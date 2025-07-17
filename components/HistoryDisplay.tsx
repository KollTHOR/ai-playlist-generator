"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Music,
  Clock,
  Loader2,
} from "lucide-react";
import { PlexTrack } from "@/types";

interface HistoryDisplayProps {
  history: PlexTrack[];
  userToken: string;
  onFilteredCountChange?: (count: number) => void; // Add this prop
}

const HistoryDisplay: React.FC<HistoryDisplayProps> = ({
  history,
  userToken,
  onFilteredCountChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  const [pageChanging, setPageChanging] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>("all");
  const [filteredHistory, setFilteredHistory] = useState<PlexTrack[]>([]);

  const timeFrameOptions = [
    { value: "all", label: "All Time" },
    { value: "day", label: "Last Day" },
    { value: "week", label: "Last Week" },
    { value: "month", label: "Last Month" },
    { value: "quarter", label: "Last 3 Months" },
    { value: "year", label: "Last Year" },
  ];

  useEffect(() => {
    const filtered = filterHistoryByTimeFrame(history, selectedTimeFrame);
    setFilteredHistory(filtered);

    // Call the callback with the filtered count
    if (onFilteredCountChange) {
      onFilteredCountChange(filtered.length);
    }
  }, [history, selectedTimeFrame, onFilteredCountChange]);

  // Filter history by time frame
  const filterHistoryByTimeFrame = (
    history: PlexTrack[],
    timeFrame: string
  ): PlexTrack[] => {
    if (timeFrame === "all") return history;

    const now = new Date();
    const cutoffDate = new Date();

    switch (timeFrame) {
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

    return history.filter((track) => {
      if (!track.viewedAt) return false;
      const trackDate = new Date(track.viewedAt * 1000);
      return trackDate >= cutoffDate;
    });
  };

  // Update filtered history when timeframe or history changes
  useEffect(() => {
    const filtered = filterHistoryByTimeFrame(history, selectedTimeFrame);
    setFilteredHistory(filtered);
  }, [history, selectedTimeFrame]);

  // Calculate pagination based on filtered history
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  // Reset page when filtered history changes
  useEffect(() => {
    setCurrentPage(1);
    setImageErrors({});
    setImageLoading({});
  }, [filteredHistory]);

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
    const newItems = filteredHistory.slice(newStartIndex, newEndIndex);

    const newLoadingState: Record<string, boolean> = {};
    newItems.forEach((track) => {
      newLoadingState[track.ratingKey] = true;
    });
    setImageLoading(newLoadingState);

    setTimeout(() => {
      setPageChanging(false);
    }, 100);
  };

  // Format timestamp
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get album artwork URL with user token
  const getAlbumArtUrl = (track: PlexTrack): string => {
    if (track.parentThumb) {
      return `/api/plex/image?path=${encodeURIComponent(
        track.parentThumb
      )}&token=${encodeURIComponent(userToken)}`;
    } else if (track.grandparentThumb) {
      return `/api/plex/image?path=${encodeURIComponent(
        track.grandparentThumb
      )}&token=${encodeURIComponent(userToken)}`;
    }
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

  return (
    <div className="bg-gray-700 rounded-lg border border-gray-600 flex flex-col h-full max-h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-600 flex-shrink-0">
        <h3 className="font-semibold text-gray-200 mb-4">Listening History</h3>

        {/* Time Frame Filter */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          {timeFrameOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedTimeFrame(option.value)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedTimeFrame === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-gray-200 hover:bg-gray-500"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Music className="w-4 h-4" />
            <span>{filteredHistory.length} tracks</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              {
                timeFrameOptions.find((opt) => opt.value === selectedTimeFrame)
                  ?.label
              }
            </span>
          </div>
          {selectedTimeFrame !== "all" && (
            <div className="text-xs text-gray-500">
              ({history.length} total available)
            </div>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-grow overflow-y-auto">
        {currentItems.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No listening history found for the selected time frame.</p>
            <p className="text-sm mt-2">
              Try selecting a different time period.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-600">
            {currentItems.map((track, index) => (
              <div
                key={`${track.ratingKey}-${track.viewedAt}-${index}`}
                className={`p-4 hover:bg-gray-600 transition-colors ${
                  pageChanging ? "opacity-70" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Album Artwork with Loading State */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-600 relative">
                      {!imageErrors[track.ratingKey] ? (
                        <>
                          <Image
                            src={getAlbumArtUrl(track)}
                            alt={`${track.parentTitle} album art`}
                            width={48}
                            height={48}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                              imageLoading[track.ratingKey]
                                ? "opacity-0"
                                : "opacity-100"
                            }`}
                            onError={() => handleImageError(track.ratingKey)}
                            onLoad={() => handleImageLoad(track.ratingKey)}
                            unoptimized
                          />
                          {/* Loading Spinner Overlay */}
                          {imageLoading[track.ratingKey] && (
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
                        <p className="font-medium text-gray-100 truncate">
                          {track.title}
                        </p>
                        <p className="text-sm text-gray-300 truncate">
                          {track.grandparentTitle}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {track.parentTitle}
                        </p>
                      </div>

                      {/* Play Time */}
                      <div className="flex items-center gap-1 text-xs text-gray-400 ml-2">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(track.viewedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-600 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1}-
              {Math.min(endIndex, filteredHistory.length)} of{" "}
              {filteredHistory.length} tracks
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

export default HistoryDisplay;
