// src/pages/NotificationsPage.tsx
import React, { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/hooks/useNotifications';
import { useFollow } from '@/hooks/useFollow';
import { Check, X, Bell, UserPlus, UserCheck, Trash2 } from 'lucide-react';
import { formatImageUrl } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '@/services/api';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';

interface NotificationItemProps {
  notification: {
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
  };
  onMarkAsRead: (id: string) => void;
}

function getNotificationContent(notification: NotificationItemProps['notification']) {
  if (notification.content) return notification.content;
  switch (notification.type) {
    case 'like':
      return 'liked your post';
    case 'comment':
      return 'commented on your post';
    case 'follow':
      return 'started following you';
    case 'follow_request':
      return 'requested to follow you';
    case 'follow_request_accepted':
      return 'accepted your follow request';
    case 'mention':
      return 'mentioned you in a comment';
    case 'message':
      return 'sent you a message';
    default:
      return 'interacted with your content';
  }
}

function getNotificationIcon(type: NotificationItemProps['notification']['type']) {
  switch (type) {
    case 'follow_request':
      return <UserPlus className="h-4 w-4 text-blue-500" />;
    case 'follow':
    case 'follow_request_accepted':
      return <UserCheck className="h-4 w-4 text-green-500" />;
    default:
      return null;
  }
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const { acceptFollowRequest, declineFollowRequest } = useFollow();
  const queryClient = useQueryClient();

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      console.log(`Accepting follow request from ${notification.sender.username}`);
      await acceptFollowRequest(notification.sender._id, notification.sender.username);
      onMarkAsRead(notification._id);
      await queryClient.refetchQueries({ queryKey: ['notifications'] });
      toast.success('Follow request accepted');
    } catch (error) {
      console.error('Error accepting follow request:', error);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      console.log(`Declining follow request from ${notification.sender.username}`);
      await declineFollowRequest(notification.sender._id, notification.sender.username);
      onMarkAsRead(notification._id);
      await queryClient.refetchQueries({ queryKey: ['notifications'] });
      toast.info('Follow request declined');
    } catch (error) {
      console.error('Error declining follow request:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      console.log(`Deleting notification ${notification._id}`);
      await notificationAPI.deleteNotification(notification._id);
      await queryClient.refetchQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleItemClick = () => {
    onMarkAsRead(notification._id);
    if (notification.type === 'message') {
      window.location.href = '/messages';
    } else if ((notification.type === 'like' || notification.type === 'comment') && notification.post) {
      window.location.href = `/post/${notification.post}`;
    } else if (notification.sender) {
      window.location.href = `/profile/${notification.sender.username}`;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center p-4 rounded-md',
        notification.read ? 'bg-background' : 'bg-muted/50',
        'hover:bg-accent/50 transition-colors cursor-pointer'
      )}
      onClick={handleItemClick}
    >
      <Avatar className="h-12 w-12 mr-4">
        <AvatarImage src={formatImageUrl(notification.sender.profileImage)} alt={notification.sender.username} />
        <AvatarFallback>{notification.sender.username[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm flex items-center gap-1.5">
          <span className="font-medium">{notification.sender.username}</span>
          {getNotificationIcon(notification.type)}
          <span className={!notification.read ? 'font-medium' : ''}>
            {getNotificationContent(notification)}
          </span>
          <span className="text-muted-foreground ml-1 text-xs">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </p>
      </div>
      <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0 ml-2" onClick={handleDelete} title="Delete notification">
        <Trash2 className="h-4 w-4" />
      </Button>
      {notification.type === 'follow_request' && (
        <div className="flex gap-2 ml-2">
          <Button size="sm" variant="default" className="rounded-full h-8 w-8 p-0" onClick={handleAccept} title="Accept follow request">
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="rounded-full h-8 w-8 p-0" onClick={handleDecline} title="Decline follow request">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {!notification.read && notification.type !== 'follow_request' && (
        <div className="ml-4 h-2 w-2 rounded-full bg-primary"></div>
      )}
    </div>
  );
}

interface NotificationsListProps {
  notifications: Array<any>;
  markAsRead: (id: string) => void;
}

function NotificationsList({ notifications, markAsRead }: NotificationsListProps) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No notifications to display</p>
      </div>
    );
  }
  return (
    <ScrollArea className="h-[calc(100vh-250px)]">
      <div className="space-y-1">
        {notifications.map((notification) => (
          <NotificationItem key={notification._id} notification={notification} onMarkAsRead={markAsRead} />
        ))}
      </div>
    </ScrollArea>
  );
}

export default function NotificationsPage() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, refetch } = useNotifications();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') {
      console.error('Socket is not a valid instance:', socket);
      return;
    }
    const handleToast = (data: any) => {
      console.log('[SOCKET] Toast notification received:', data);
      toast.info(data.message);
      refetch();
    };
    socket.on('toastNotification', handleToast);
    return () => {
      socket.off('toastNotification', handleToast);
    };
  }, [socket, refetch]);

  const handleClearNotifications = async () => {
    try {
      console.log('[NOTIFICATIONS] Clearing all notifications (marking as read)');
      await markAllAsRead();
      await queryClient.refetchQueries({ queryKey: ['notifications'] });
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      
      refetch();
    }, 1000);
    return () => clearInterval(intervalId);
  }, [refetch]);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const followRequests = notifications.filter((n) => n.type === 'follow_request');

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        <div className="space-y-4">
          {Array(5)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="flex items-center p-4 rounded-md bg-muted">
                <Skeleton className="h-12 w-12 rounded-full mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in text-center py-12">
        <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium mb-2">No notifications yet</h2>
        <p className="text-muted-foreground">When you get notifications, they'll appear here</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
          <Button variant="ghost" onClick={handleClearNotifications}>
            Clear notifications
          </Button>
        </div>
      </div>
      <Tabs defaultValue={followRequests.length > 0 ? 'requests' : 'all'} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread" disabled={unreadCount === 0}>
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" disabled={followRequests.length === 0}>
            Requests
            {followRequests.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                {followRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="m-0">
          <NotificationsList notifications={notifications} markAsRead={markAsRead} />
        </TabsContent>
        <TabsContent value="unread" className="m-0">
          <NotificationsList notifications={unreadNotifications} markAsRead={markAsRead} />
        </TabsContent>
        <TabsContent value="requests" className="m-0">
          <NotificationsList notifications={followRequests} markAsRead={markAsRead} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
