// src/hooks/useFollow.tsx
import { useState, useCallback } from 'react';
import { userAPI } from '@/services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';

export function useFollow() {
  const [followStatus, setFollowStatus] = useState<'not_following' | 'following' | 'requested' | 'loading'>('not_following');
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const followUser = useCallback(async (userId: string, username: string, isPrivate: boolean) => {
    try {
      setFollowStatus('loading');
      const response = await userAPI.followUser(userId);
      console.log('Follow response:', response.data);
      if (isPrivate) {
        toast.info(`Follow request sent to ${username}`);
        setFollowStatus('requested');
      } else {
        toast.success(`You are now following ${username}`);
        setFollowStatus('following');
      }
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
      queryClient.invalidateQueries({ queryKey: ['search-users'] });
      return response.data;
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
      setFollowStatus('not_following');
      throw error;
    }
  }, [queryClient]);

  const unfollowUser = useCallback(async (userId: string, username: string) => {
    try {
      setFollowStatus('loading');
      await userAPI.unfollowUser(userId);
      toast.success(`You unfollowed ${username}`);
      setFollowStatus('not_following');
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
      queryClient.invalidateQueries({ queryKey: ['search-users'] });
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow user');
      setFollowStatus('following');
      throw error;
    }
  }, [queryClient]);

  const cancelFollowRequest = useCallback(async (userId: string, username: string) => {
    try {
      setFollowStatus('loading');
      await userAPI.cancelRequest(userId);
      toast.success(`Canceled follow request to ${username}`);
      setFollowStatus('not_following');
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
      queryClient.invalidateQueries({ queryKey: ['search-users'] });
      return true;
    } catch (error) {
      console.error('Error canceling follow request:', error);
      toast.error('Failed to cancel follow request');
      setFollowStatus('requested');
      throw error;
    }
  }, [queryClient]);

  const acceptFollowRequest = useCallback(async (userId: string, username: string) => {
    try {
      await userAPI.acceptFollow(userId);
      toast.success(`You accepted ${username}'s follow request`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
      queryClient.invalidateQueries({ queryKey: ['search-users'] });
      return true;
    } catch (error) {
      console.error('Error accepting follow request:', error);
      toast.error('Failed to accept follow request');
      throw error;
    }
  }, [queryClient]);

  const declineFollowRequest = useCallback(async (userId: string, username: string) => {
    try {
      await userAPI.declineFollow(userId);
      toast.success(`You declined ${username}'s follow request`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      return true;
    } catch (error) {
      console.error('Error declining follow request:', error);
      toast.error('Failed to decline follow request');
      throw error;
    }
  }, [queryClient]);

  const setupSocketListeners = useCallback(() => {
    if (socket) {
      console.log('Setting up follow socket listeners');
      socket.on('followRequestAccepted', (data) => {
        console.log('Follow request accepted:', data);
        toast.success(`${data.username} accepted your follow request`);
        queryClient.invalidateQueries({ queryKey: ['profile', data.username] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
      socket.on('newFollowRequest', (data) => {
        console.log('New follow request:', data);
        toast.info(`${data.username} requested to follow you`, {
          action: {
            label: 'View',
            onClick: () => {
              window.location.href = '/notifications';
            }
          }
        });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
      socket.on('newFollower', (data) => {
        console.log('New follower:', data);
        toast.success(`${data.username} started following you`);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      });
    }
  }, [socket, queryClient]);

  const cleanupSocketListeners = useCallback(() => {
    if (socket) {
      console.log('Cleaning up follow socket listeners');
      socket.off('followRequestAccepted');
      socket.off('newFollowRequest');
      socket.off('newFollower');
    }
  }, [socket]);

  return {
    followStatus,
    setFollowStatus,
    followUser,
    unfollowUser,
    cancelFollowRequest,
    acceptFollowRequest,
    declineFollowRequest,
    setupSocketListeners,
    cleanupSocketListeners,
  };
}
