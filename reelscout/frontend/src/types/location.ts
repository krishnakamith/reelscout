// Types for location data extracted from Instagram Reels

export interface LocationData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  region: string;
  country: string;
  category: string;
  hiddenGemScore: number; // 1-100
  
  // Extracted from reel
  reelUrl: string;
  reelAuthor: string;
  reelAuthorHandle: string;
  extractedAt: string;
  
  // AI-generated insights
  bestTimeToVisit: string;
  estimatedDuration: string;
  difficultyLevel: 'Easy' | 'Moderate' | 'Challenging' | 'Expert';
  accessibility: string;
  entryFee: string;
  
  // Tips and highlights
  tips: string[];
  highlights: string[];
  warnings: string[];
  
  // Nearby
  nearbyPlaces: NearbyPlace[];
  
  // Community data
  communityInsights: CommunityInsight[];
  
  // Media
  images: string[];
  videoThumbnail: string;
}

export interface NearbyPlace {
  name: string;
  type: 'restaurant' | 'hotel' | 'attraction' | 'transport';
  distance: string;
  rating?: number;
}

export interface CommunityInsight {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  date: string;
  helpful: number;
  verified: boolean;
}
