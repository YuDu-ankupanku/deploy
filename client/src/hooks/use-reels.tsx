
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reelsAPI, ReelData } from '@/services/api';
import { toast } from 'sonner';

export function useReels() {
  const queryClient = useQueryClient();
  
  // Get all reels
  const { 
    data: reels = [], 
    isLoading,
    error
  } = useQuery({
    queryKey: ['reels'],
    queryFn: async () => {
      // For development, return mock data
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            id: '1',
            userId: '1',
            username: 'traveler',
            userAvatar: 'https://source.unsplash.com/random/100x100?face=2',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            caption: 'Exploring the beautiful landscapes of Norway 🏔️ #travel #nature',
            likes: 1243,
            comments: 89,
            timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
            liked: false,
            saved: false
          },
          {
            id: '2',
            userId: '2',
            username: 'foodie',
            userAvatar: 'https://source.unsplash.com/random/100x100?face=3',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            caption: 'Making homemade pasta from scratch 🍝 #food #cooking #recipe',
            likes: 982,
            comments: 45,
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            liked: false,
            saved: false
          },
          {
            id: '3',
            userId: '3',
            username: 'dancer',
            userAvatar: 'https://source.unsplash.com/random/100x100?face=4',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            caption: 'New choreography! What do you think? 💃 #dance #choreography',
            likes: 2455,
            comments: 132,
            timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
            liked: false,
            saved: false
          }
        ];
      }
      
      // Real API call
      const response = await reelsAPI.getReels();
      return response.data;
    },
  });

  // Like a reel
  const likeMutation = useMutation({
    mutationFn: (reelId: string) => reelsAPI.likeReel(reelId),
    onMutate: async (reelId) => {
      // Optimistically update to the new value
      await queryClient.cancelQueries({ queryKey: ['reels'] });
      
      // Snapshot the previous value
      const previousReels = queryClient.getQueryData<ReelData[]>(['reels']);
      
      // Optimistically update the cache
      queryClient.setQueryData<ReelData[]>(['reels'], old => 
        old?.map(reel => 
          reel.id === reelId 
            ? { ...reel, liked: true, likes: reel.likes + 1 }
            : reel
        ) ?? []
      );
      
      return { previousReels };
    },
    onError: (err, reelId, context) => {
      // Rollback on error
      queryClient.setQueryData(['reels'], context?.previousReels);
      toast.error('Failed to like reel');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
    },
  });

  // Unlike a reel
  const unlikeMutation = useMutation({
    mutationFn: (reelId: string) => reelsAPI.unlikeReel(reelId),
    onMutate: async (reelId) => {
      await queryClient.cancelQueries({ queryKey: ['reels'] });
      
      const previousReels = queryClient.getQueryData<ReelData[]>(['reels']);
      
      queryClient.setQueryData<ReelData[]>(['reels'], old => 
        old?.map(reel => 
          reel.id === reelId 
            ? { ...reel, liked: false, likes: reel.likes - 1 }
            : reel
        ) ?? []
      );
      
      return { previousReels };
    },
    onError: (err, reelId, context) => {
      queryClient.setQueryData(['reels'], context?.previousReels);
      toast.error('Failed to unlike reel');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
    },
  });

  // Save a reel
  const saveMutation = useMutation({
    mutationFn: (reelId: string) => reelsAPI.saveReel(reelId),
    onMutate: async (reelId) => {
      await queryClient.cancelQueries({ queryKey: ['reels'] });
      
      const previousReels = queryClient.getQueryData<ReelData[]>(['reels']);
      
      queryClient.setQueryData<ReelData[]>(['reels'], old => 
        old?.map(reel => 
          reel.id === reelId 
            ? { ...reel, saved: true }
            : reel
        ) ?? []
      );
      
      return { previousReels };
    },
    onError: (err, reelId, context) => {
      queryClient.setQueryData(['reels'], context?.previousReels);
      toast.error('Failed to save reel');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
    },
  });

  // Unsave a reel
  const unsaveMutation = useMutation({
    mutationFn: (reelId: string) => reelsAPI.unsaveReel(reelId),
    onMutate: async (reelId) => {
      await queryClient.cancelQueries({ queryKey: ['reels'] });
      
      const previousReels = queryClient.getQueryData<ReelData[]>(['reels']);
      
      queryClient.setQueryData<ReelData[]>(['reels'], old => 
        old?.map(reel => 
          reel.id === reelId 
            ? { ...reel, saved: false }
            : reel
        ) ?? []
      );
      
      return { previousReels };
    },
    onError: (err, reelId, context) => {
      queryClient.setQueryData(['reels'], context?.previousReels);
      toast.error('Failed to unsave reel');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
    },
  });

  const handleLikeReel = (reelId: string, isLiked: boolean) => {
    if (isLiked) {
      unlikeMutation.mutate(reelId);
    } else {
      likeMutation.mutate(reelId);
    }
  };

  const handleSaveReel = (reelId: string, isSaved: boolean) => {
    if (isSaved) {
      unsaveMutation.mutate(reelId);
    } else {
      saveMutation.mutate(reelId);
    }
  };

  return {
    reels,
    isLoading,
    error,
    handleLikeReel,
    handleSaveReel,
  };
}
