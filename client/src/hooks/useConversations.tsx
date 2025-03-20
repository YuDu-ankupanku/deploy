
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSocket } from './useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { messageAPI, userAPI, formatImageUrl } from '@/services/api';

interface User {
  _id: string;
  username: string;
  fullName: string;
  profileImage: string;
  isVerified?: boolean;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  text: string | null;
  media: string | null;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  isGroup: boolean;
  groupName: string | null;
  lastMessage: Message | null;
  createdAt: string;
  updatedAt: string;
  // UI helper properties
  unread?: boolean;
}

export const useConversations = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [availableContacts, setAvailableContacts] = useState<User[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  useEffect(() => {
    const loadContacts = async () => {
      if (!user?._id) return;
      
      setIsLoadingContacts(true);
      try {
        const followingResponse = await userAPI.getFollowing(user.username);
        const suggestionsResponse = await userAPI.getSuggestions();
        
        const following = followingResponse.data?.following || [];
        const suggestions = suggestionsResponse.data || [];
        
        const allContacts = [...following, ...suggestions];
        
        const uniqueContacts = Array.from(
          new Map(allContacts.map(contact => [contact._id, contact])).values()
        );
        
        const formattedContacts = uniqueContacts.map(contact => ({
          ...contact,
          profileImage: formatImageUrl(contact.profileImage)
        }));
        
        setAvailableContacts(formattedContacts);
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        setIsLoadingContacts(false);
      }
    };
    
    loadContacts();
  }, [user?.username, user?._id]);

  const { 
    data: conversations, 
    isLoading: conversationsLoading, 
    error: conversationsError,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await messageAPI.getConversations();
      
      const formattedConversations = response.data.map((conversation: Conversation) => {
        const formattedParticipants = conversation.participants.map(participant => ({
          ...participant,
          profileImage: formatImageUrl(participant.profileImage)
        }));
        
        const isLastMessageFromCurrentUser = conversation.lastMessage && 
          conversation.lastMessage.sender._id === user?._id;
        
        const isUnread = conversation.lastMessage && 
          !isLastMessageFromCurrentUser && 
          !conversation.lastMessage.readBy.includes(user?._id);
          
        return {
          ...conversation,
          participants: formattedParticipants,
          unread: isUnread || false
        };
      });
      
      return formattedConversations;
    },
    enabled: !!user
  });

  const { 
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: async ({ pageParam }) => {
      if (!activeConversationId) return { messages: [], hasMore: false };
      
      const response = await messageAPI.getMessages(activeConversationId, pageParam);
      
      const messagesWithFormattedMedia = response.data.messages.map((message: any) => ({
        ...message,
        media: message.media ? formatImageUrl(message.media) : null,
        sender: {
          ...message.sender,
          profileImage: formatImageUrl(message.sender.profileImage)
        }
      }));
      
      return {
        ...response.data,
        messages: messagesWithFormattedMedia
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    enabled: !!activeConversationId && !!user
  });

  const activeConversation = conversations?.find(
    (conversation: Conversation) => conversation._id === activeConversationId
  ) || null;

  const messages = messagesData?.pages.flatMap(page => page.messages) || [];

  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      text, 
      media = null 
    }: { 
      conversationId: string, 
      text?: string, 
      media?: File | null
    }) => {
      const response = await messageAPI.sendMessage(conversationId, text || '', media);
      return response.data;
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['messages', activeConversationId], (oldData: any) => {
        if (!oldData) return { pages: [{ messages: [newMessage], hasMore: false }], pageParams: [1] };
        
        const newFirstPage = {
          ...oldData.pages[0],
          messages: [...oldData.pages[0].messages, newMessage]
        };
        
        return {
          ...oldData,
          pages: [newFirstPage, ...oldData.pages.slice(1)]
        };
      });
      
      queryClient.setQueryData(['conversations'], (oldData: any) => {
        if (!oldData) return [];
        
        return oldData.map((conversation: Conversation) => {
          if (conversation._id === activeConversationId) {
            return {
              ...conversation,
              lastMessage: newMessage,
              updatedAt: new Date().toISOString()
            };
          }
          return conversation;
        });
      });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  });

  const createConversationMutation = useMutation({
    mutationFn: async ({ 
      participants, 
      isGroup = false, 
      groupName = null 
    }: { 
      participants: string[], 
      isGroup?: boolean, 
      groupName?: string | null 
    }) => {
      const response = await messageAPI.createConversation(participants, isGroup, groupName);
      return response.data;
    },
    onSuccess: (newConversation) => {
      queryClient.setQueryData(['conversations'], (oldData: any) => {
        if (!oldData) return [newConversation];
        
        const exists = oldData.some((c: Conversation) => c._id === newConversation._id);
        if (exists) return oldData;
        
        return [newConversation, ...oldData];
      });
      
      setActiveConversationId(newConversation._id);
      
      refetchConversations();
      
      toast.success('Conversation created');
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return messageAPI.markAsRead(conversationId);
    },
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData(['conversations'], (oldData: any) => {
        if (!oldData) return [];
        
        return oldData.map((conversation: Conversation) => {
          if (conversation._id === conversationId) {
            return {
              ...conversation,
              unread: false,
              lastMessage: conversation.lastMessage 
                ? {
                    ...conversation.lastMessage,
                    readBy: [...conversation.lastMessage.readBy, user?._id]
                  }
                : null
            };
          }
          return conversation;
        });
      });
    }
  });

  useEffect(() => {
    if (!socket || !user?._id) return;

    socket.on('newMessage', (message: Message) => {
      console.log('New message received:', message);
      
      if (message.conversation === activeConversationId) {
        queryClient.setQueryData(['messages', activeConversationId], (oldData: any) => {
          if (!oldData) return { pages: [{ messages: [message], hasMore: false }], pageParams: [1] };
          
          const newFirstPage = {
            ...oldData.pages[0],
            messages: [...oldData.pages[0].messages, message]
          };
          
          return {
            ...oldData,
            pages: [newFirstPage, ...oldData.pages.slice(1)]
          };
        });
        
        markAsReadMutation.mutate(message.conversation);
      }
      
      queryClient.setQueryData(['conversations'], (oldData: any) => {
        if (!oldData) return [];
        
        const conversationIndex = oldData.findIndex(
          (c: Conversation) => c._id === message.conversation
        );
        
        if (conversationIndex === -1) {
          refetchConversations();
          return oldData;
        }
        
        return oldData.map((conversation: Conversation) => {
          if (conversation._id === message.conversation) {
            const isFromCurrentUser = message.sender._id === user._id;
            
            return {
              ...conversation,
              lastMessage: message,
              unread: !isFromCurrentUser,
              updatedAt: new Date().toISOString()
            };
          }
          return conversation;
        });
      });
    });

    return () => {
      socket.off('newMessage');
    };
  }, [socket, queryClient, user, activeConversationId]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    
    markAsReadMutation.mutate(conversationId);
  };

  const handleSendMessage = (text: string, media: File | null = null) => {
    if (!activeConversationId) return;
    
    sendMessageMutation.mutate({
      conversationId: activeConversationId,
      text,
      media
    });
  };

  const startNewConversation = (userId: string) => {
    createConversationMutation.mutate({
      participants: [userId],
      isGroup: false
    });
  };

  return {
    conversations: conversations || [],
    activeConversation,
    messages,
    conversationsLoading,
    messagesLoading,
    conversationsError,
    messagesError,
    activeConversationId,
    hasMoreMessages: hasNextPage,
    loadMoreMessages: fetchNextPage,
    isLoadingMoreMessages: isFetchingNextPage,
    selectConversation: handleSelectConversation,
    sendMessage: handleSendMessage,
    createConversation: createConversationMutation.mutate,
    isCreatingConversation: createConversationMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    availableContacts,
    isLoadingContacts,
    startNewConversation,
    refetchConversations  // Expose the refetch function from the query
  };
};
