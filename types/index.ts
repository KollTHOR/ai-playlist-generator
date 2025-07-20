// Complete types.ts file
export interface PlexTrack {
  ratingKey: string;
  title: string;
  artist: string;
  grandparentTitle: string;
  album: string;
  parentTitle: string;
  track?: string;
  trackNumber?: number;
  year?: number;
  duration?: number;
  addedAt?: number;
  updatedAt?: number;
  viewedAt?: number;
  thumb?: string;
  art?: string;
}

export interface PlaylistRequest {
  title: string;
  trackIds: string[];
}

export interface AIRecommendation {
  artist: string;
  title: string;
  album?: string;
  reason: string;
  confidence?: string;
  genres?: string[];
}

export interface MusicProfile {
  primaryGenres: string[];
  moods: string[];
  styles: string[];
  era: string;
  energy: string;
}

export interface RecommendedTrack {
  artist: string;
  title: string;
  album: string;
  reason: string;
  confidence: string;
  genres?: string[];
}

export interface TrackAvailabilityItem extends RecommendedTrack {
  available: boolean;
  plexData: PlexTrack | null;
}

export interface TrackAvailability {
  totalTracksRecommended: number;
  availableTracks: number;
  trackAvailability: TrackAvailabilityItem[];
}

export interface AITrackAnalysisResponse {
  musicProfile: MusicProfile;
  recommendedTracks: RecommendedTrack[];
}
