
// import api from './api';

// export interface ReelData {
//   id: string;
//   userId: string;
//   username: string;
//   userAvatar: string;
//   videoUrl: string;
//   caption: string;
//   likes: number;
//   comments: number;
//   timestamp: string;
//   liked: boolean;
//   saved: boolean;
// }

// export const reelsAPI = {
//   // Get reels feed
//   getReels: () => api.get('/reels'),
  
//   // Like a reel
//   likeReel: (reelId: string) => api.post(`/reels/like/${reelId}`),
  
//   // Unlike a reel
//   unlikeReel: (reelId: string) => api.post(`/reels/unlike/${reelId}`),
  
//   // Save a reel
//   saveReel: (reelId: string) => api.post(`/reels/save/${reelId}`),
  
//   // Unsave a reel
//   unsaveReel: (reelId: string) => api.post(`/reels/unsave/${reelId}`),
  
//   // Create a new reel
//   createReel: (reelData: FormData) => api.post('/reels', reelData),
  
//   // Delete a reel
//   deleteReel: (reelId: string) => api.delete(`/reels/${reelId}`),
  
//   // Get reels by user
//   getUserReels: (userId: string) => api.get(`/reels/user/${userId}`),
// };
