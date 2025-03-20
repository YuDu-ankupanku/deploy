import axios from 'axios';

// Base URL for API calls
const API_URL = import.meta.env.VITE_API_URL || 'https://photogram-backend-pnc8.onrender.com/api';
// UPLOADS_URL is set to the server's base URL so that when a stored file path (e.g. "uploads/profiles/filename.jpg") is appended,
// the final URL becomes "http://localhost:5000/uploads/profiles/filename.jpg"
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'https://photogram-backend-pnc8.onrender.com';


const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add token to requests and handle FormData Content-Type
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced Format image URL function
export const formatImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  
  // Remove any leading "./" or "/" characters.
  imageUrl = imageUrl.replace(/^(\.\/|\/)+/, '');
  
  // Remove all leading occurrences of "uploads/" (or normalize to a single "uploads/").
  imageUrl = imageUrl.replace(/^(uploads\/)+/, 'uploads/');
  
  const finalUrl = `${UPLOADS_URL}/${imageUrl}`;
  console.log("Formatted image URL:", finalUrl);
  return finalUrl;
};

// ------------------
// API Endpoints
// ------------------

// Auth API (profile update removed here)
export const authAPI = {
  register: (formData) => api.post('/auth/register', formData),
  login: (formData) => api.post('/auth/login', formData),
  getCurrentUser: () => api.get('/auth/me'),
  verifyToken: (token) => api.post('/auth/verify-token', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  // Updated resetPassword to accept token, otp, and newPassword
  resetPassword: (token, otp, newPassword) =>
    api.post('/auth/reset-password', { token, otp, newPassword }),
  updatePassword: (formData) => api.put('/auth/update-password', formData),
  updateEmail: (email) => api.put('/auth/update-email', { email }),
  updateUsername: (username) => api.put('/auth/update-username', { username }),
  logout: () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
  },
  getPrivacySettings: () => api.get('/auth/privacy-settings'),
  updatePrivacySettings: (settings) => api.put('/auth/update-privacy-settings', settings),
};


export const postAPI = {
  getPosts: (page = 1, limit = 10) => api.get(`/posts?page=${page}&limit=${limit}`),
  getPost: (id) => api.get(`/posts/${id}`),
  createPost: (formData) => {
    console.log('Submitting form data to API:', formData);
    return api.post('/posts', formData);
  },
  updatePost: (id, formData) => api.put(`/posts/${id}`, formData),
  deletePost: (id) => api.delete(`/posts/${id}`),
  likePost: (id) => api.post(`/posts/like/${id}`),
  unlikePost: (id) => api.post(`/posts/unlike/${id}`),
  savePost: (id) => api.post(`/posts/save/${id}`),
  unsavePost: (id) => api.post(`/posts/unsave/${id}`),
  getUserPosts: (username, page = 1, limit = 12) =>
    api.get(`/posts/user/${username}?page=${page}&limit=${limit}`),
  getExplore: (page = 1, limit = 20) =>
    api.get(`/posts/explore?page=${page}&limit=${limit}`),
  getFeed: (page = 1, limit = 10) => api.get(`/posts/feed?page=${page}&limit=${limit}`),
  getFeedPosts: (page = 1, limit = 10) => api.get(`/posts/feed?page=${page}&limit=${limit}`),
  getSaved: () => api.get('/posts/saved'),
  getLikedPosts: () => api.get('/posts/liked'),
  getSavedPosts: () => api.get('/posts/saved/list'),
};

export const commentAPI = {
  getComments: (postId, page = 1, limit = 10) =>
    api.get(`/comments/post/${postId}?page=${page}&limit=${limit}`),
  createComment: (postId, text) => api.post(`/comments/${postId}`, { text }),
  updateComment: (commentId, text) => api.put(`/comments/${commentId}`, { text }),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`),
  likeComment: (commentId) => api.post(`/comments/like/${commentId}`),
  unlikeComment: (commentId) => api.post(`/comments/unlike/${commentId}`),
  getReplies: (commentId, page = 1, limit = 5) =>
    api.get(`/comments/${commentId}/replies?page=${page}&limit=${limit}`),
  createReply: (commentId, content) =>
    api.post(`/comments/${commentId}/reply`, { content }),
};

export const storyAPI = {
  getStories: () => api.get('/stories/feed'),
  getUserStories: (username) => api.get(`/stories/user/${username}`),
  createStory: (formData) => api.post('/stories', formData),
  deleteStory: (storyId) => api.delete(`/stories/${storyId}`),
  viewStory: (storyId) => api.post(`/stories/${storyId}/view`),
};

export const notificationAPI = {
  getNotifications: (page = 1, limit = 20) =>
    api.get(`/notifications?page=${page}&limit=${limit}`),
  markAsRead: (notificationId) =>
    api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),
  deleteAllNotifications: () => api.delete('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (conversationId, page = 1, limit = 20) =>
    api.get(`/messages/conversations/${conversationId}?page=${page}&limit=${limit}`),
  sendMessage: (conversationId, text = '', media = null) => {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (media) formData.append('media', media);
    return api.post(`/messages/conversations/${conversationId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAllUsers: () => {
    console.log('Calling getAllUsers API endpoint');
    return api.get('/users/all');
  },
  createConversation: (participants, isGroup = false, groupName = null) => {
    const payload: any = { participants };
    if (isGroup) {
      payload.isGroup = true;
      payload.groupName = groupName;
    }
    return api.post('/messages/conversations', payload);
  },
  markAsRead: (conversationId) =>
    api.put(`/messages/conversations/${conversationId}/read`),
  deleteConversation: (conversationId) =>
    api.delete(`/messages/conversations/${conversationId}`),
};

export const userAPI = {
  
  getUser: (username) => api.get(`/users/${username}`),
  getProfile: (username) => api.get(`/users/${username}/profile`),
  getFollowers: (username, page = 1, limit = 20) =>
    api.get(`/users/${username}/followers?page=${page}&limit=${limit}`),
  getFollowing: (username, page = 1, limit = 20) =>
    api.get(`/users/${username}/following?page=${page}&limit=${limit}`),
  followUser: (userId) => api.post(`/users/follow/${userId}`),
  unfollowUser: (userId) => api.post(`/users/unfollow/${userId}`),
  getFollowRequests: () => api.get('/users/follow-requests'),
  getFollowRequestsCount: () => api.get('/users/follow-requests/count'),
  cancelRequest: (userId) => api.post(`/users/cancel-request/${userId}`),
  searchUsers: (query) => api.get(`/users/search/${query}`),
  getSuggestions: () => {
    console.log('Calling getSuggestions API endpoint');
    return api.get('/users/suggestions/list');
  },
  getAllUsers: () => {
    console.log('Calling getAllUsers API endpoint');
    return api.get('/users/all');
  },
  acceptFollow: (userId) => api.post(`/users/accept-follow/${userId}`),
  declineFollow: (userId) => api.post(`/users/decline-follow/${userId}`),
  getSavedPosts: () => api.get('/users/saved-posts'),
  getLikedPosts: () => api.get('/users/liked-posts'),
  // Updated updateProfile endpoint: it now targets /api/users/profile
  updateProfile: (formData) => api.put('/users/profile', formData),
};

export const reelsAPI = {
  getReels: (page = 1, limit = 10) => api.get(`/reels?page=${page}&limit=${limit}`),
  getUserReels: (username, page = 1, limit = 10) =>
    api.get(`/reels/user/${username}?page=${page}&limit=${limit}`),
  getReel: (id) => api.get(`/reels/${id}`),
  createReel: (formData) =>
    api.post('/reels', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  likeReel: (id) => api.post(`/reels/${id}/like`),
  unlikeReel: (id) => api.post(`/reels/${id}/unlike`),
  saveReel: (id) => api.post(`/reels/${id}/save`),
  unsaveReel: (id) => api.post(`/reels/${id}/unsave`),
  deleteReel: (id) => api.delete(`/reels/${id}`),
  viewReel: (id) => api.post(`/reels/${id}/view`),
};

// Define ReelData type for use in other components
export interface ReelData {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  videoUrl: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  liked: boolean;
  saved: boolean;
}

// Export all APIs together
const apiService = {
  auth: authAPI,
  post: postAPI,
  comment: commentAPI,
  story: storyAPI,
  notification: notificationAPI,
  message: messageAPI,
  user: userAPI,
  reels: reelsAPI,
};

export default apiService;
