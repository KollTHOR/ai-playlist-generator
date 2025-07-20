// Complete types.ts file
export interface PlexTrack {
  genre: string;
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
  parentThumb?: string;
  grandparentThumb?: string;
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

// Add these new interfaces for the frequency-based playlist generation
export interface GeneratedPlaylistTrack {
  title: string;
  artist: string;
  album: string;
  reason: string;
}

export interface GeneratedPlaylist {
  title: string;
  description: string;
  tracks: GeneratedPlaylistTrack[];
}

// Additional interfaces for the frequency analysis (optional, for type safety)
export interface TrackFrequency {
  track: PlexTrack;
  playCount: number;
  lastPlayed: Date;
  firstPlayed: Date;
}

export interface CategoryAnalysis {
  artists: Map<string, { playCount: number; tracks: TrackFrequency[] }>;
  albums: Map<string, { playCount: number; tracks: TrackFrequency[] }>;
}
