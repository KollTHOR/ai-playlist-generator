/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PlexTrack {
  ratingKey: string;
  key: string;
  title: string;
  grandparentTitle: string;
  parentTitle: string;
  type: string;
  thumb?: string;
  duration: number;
  addedAt: number;
  updatedAt: number;
  Media?: any[];
}

export interface LastFmTrack {
  name: string;
  artist: {
    name: string;
    mbid: string;
    url: string;
  };
  url: string;
  duration: string;
  playcount: string;
  listeners: string;
}

export interface AIRecommendation {
  artist: string;
  title: string;
  album?: string;
  reason?: string;
}

export interface PlaylistRequest {
  title: string;
  trackIds: string[];
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider: {
    max_completion_tokens?: number;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  per_request_limits?: {
    prompt_tokens: string;
    completion_tokens: string;
  };
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  isFree: boolean;
  contextLength: number;
  description?: string;
  category?: string;
}
