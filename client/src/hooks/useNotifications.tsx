// src/hooks/useNotifications.tsx
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    username: string;
    profileImage: string;
  };
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_request_accepted' | 'mention' | 'message';
  post?: string;
  comment?: string;
  message?: string;
  content?: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    data = { notifications: [] as Notification[], unreadCount: 0, hasMore: false },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationAPI.getNotifications();
      return response.data;
    },
    enabled: Boolean(user?._id && isAuthenticated),
    staleTime: 5 * 60 * 1000,
    initialData: { notifications: [], unreadCount: 0, hasMore: false },
  });

  useEffect(() => {
    if (data.notifications) {
      const count =
        data.unreadCount ||
        data.notifications.filter((n: Notification) => !n.read).length;
      setUnreadCount(count);
    }
  }, [data]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('[NOTIFICATIONS] Periodic refetch of notifications');
      refetch();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [refetch]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await notificationAPI.markAsRead(notificationId);
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          notifications: oldData.notifications.map((n: Notification) =>
            n._id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: response.data.unreadCount,
        };
      });
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          notifications: oldData.notifications.map((n: Notification) => ({
            ...n,
            read: true,
          })),
          unreadCount: 0,
        };
      });
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  return {
    notifications: data.notifications,
    hasMore: data.hasMore,
    isLoading,
    error,
    refetch,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
