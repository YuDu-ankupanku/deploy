// src/hooks/useSocket.tsx
import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import socketService from '@/services/socket'; // This may still be used for initialization
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useSocket() {
  const { user, isAuthenticated } = useAuth();
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const queryClient = useQueryClient();

  const initializeSocket = useCallback(() => {
    if (isAuthenticated && user?._id && !isConnecting) {
      setIsConnecting(true);
      try {
        // Initialize the socket (ensure VITE_SOCKET_URL is set in .env)
        const sock = socketService.initialize(user._id);
        setSocketInstance(sock);

        sock.on('connect', () => {
          console.log('Socket connected with id:', sock.id);
          sock.emit('authenticate', user._id);  // Authenticate after connecting
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionAttempts(0);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        });
        

        sock.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        sock.on('reconnect', () => {
          console.log('Socket reconnected');
          setIsConnected(true);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['active-conversation'] });
        });

        sock.on('unreadNotificationsCount', (count: number) => {
          queryClient.setQueryData(['notifications'], (oldData: any) => {
            if (!oldData) return { notifications: [], unreadCount: count };
            return { ...oldData, unreadCount: count };
          });
        });

        // Other socket event listeners (newNotification, newMessage, error, etc.)...
        sock.on('newNotification', (notification: any) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          let message = 'You have a new notification';
          switch (notification.type) {
            case 'like':
              message = `${notification.sender.username} liked your post`;
              break;
            case 'comment':
              message = `${notification.sender.username} commented on your post`;
              break;
            case 'follow':
              message = `${notification.sender.username} started following you`;
              break;
            case 'follow_request':
              message = `${notification.sender.username} requested to follow you`;
              break;
            case 'follow_request_accepted':
              message = `${notification.sender.username} accepted your follow request`;
              break;
            case 'message':
              message = `New message from ${notification.sender.username}`;
              break;
            default:
              break;
          }
          toast(message, {
            description: notification.content || 'Check your notifications',
            action: {
              label: 'View',
              onClick: () => (window.location.href = '/notifications')
            }
          });
        });

        sock.on('newMessage', (message: any) => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['active-conversation', message.conversation] });
          if (message.sender._id !== user._id) {
            toast(`New message from ${message.sender.username}`, {
              description: message.text || 'Media message',
              action: {
                label: 'View',
                onClick: () => (window.location.href = `/messages?id=${message.conversation}`)
              }
            });
          }
        });

        sock.on('error', (error: any) => {
          console.error('Socket error:', error);
          setIsConnecting(false);
          setConnectionAttempts((prev) => prev + 1);
          if (connectionAttempts > 2) {
            toast.error('Having trouble connecting to notifications service', {
              description: 'Real-time updates may be delayed'
            });
          }
        });
      } catch (error) {
        console.error('Error initializing socket:', error);
        setIsConnecting(false);
      }
    }
    return () => {
      const sock = socketService.getSocket();
      if (sock && typeof sock.disconnect === 'function') {
        sock.disconnect();
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, user, queryClient, isConnecting, connectionAttempts]);

  useEffect(() => {
    const cleanup = initializeSocket();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeSocket]);

  const reconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setTimeout(() => {
      initializeSocket();
    }, 1000);
  }, [initializeSocket]);

  // IMPLEMENT sendTyping and sendStopTyping using the current socketInstance
  const sendTyping = (conversationId: string) => {
    if (socketInstance) {
      socketInstance.emit("typing", conversationId);
    } else {
      console.warn("Socket not connected: cannot send typing event");
    }
  };

  const sendStopTyping = (conversationId: string) => {
    if (socketInstance) {
      socketInstance.emit("stopTyping", conversationId);
    } else {
      console.warn("Socket not connected: cannot send stop typing event");
    }
  };

  const markMessageRead = (messageId: string) => {
    if (socketInstance) {
      socketInstance.emit("markMessageRead", { messageId });
    } else {
      console.warn("Socket not connected: cannot mark message as read");
    }
  };

  return {
    isConnected,
    socket: socketInstance,
    // Instead of using functions from socketService, we use our own implementations
    sendMessage: socketService.sendMessage, // Assuming sendMessage works correctly
    sendTyping,
    sendStopTyping,
    markMessageRead,
    reconnect,
  };
}
