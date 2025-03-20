// src/pages/MessagesPage.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  Pencil,
  Send,
  Info,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { messageAPI, userAPI, formatImageUrl } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocket } from "@/hooks/useSocket";

const MessagesPage = () => {
  const { user } = useAuth();
  const { socket, sendTyping, sendStopTyping } = useSocket();

  // Tabs: "conversations" or "users"
  const [activeTab, setActiveTab] = useState<"conversations" | "users">("conversations");

  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Realtime features
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState<"online" | "offline">("offline");

  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await messageAPI.getConversations();
      return response.data;
    },
    enabled: Boolean(user?._id),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch all users for "Users" tab
  const {
    data: allUsers = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const response = await userAPI.getAllUsers();
      return response.data;
    },
    enabled: Boolean(user?._id),
    staleTime: 5 * 60 * 1000,
  });

  // Helper: get other participant from a conversation
  const getOtherParticipant = (conv: any) => {
    if (!user || !conv?.participants) return null;
    return conv.participants.find((p: any) => p._id !== user._id);
  };

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const response = await messageAPI.getMessages(conversationId);
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // When activeConversationId changes, load messages
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  // Select a conversation from conversation list
  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    const conv = conversations.find((c: any) => c._id === conversationId);
    setActiveConversation(conv);
    // Reset typing indicator when switching conversation
    setIsTyping(false);
  };

  // Updated input change handler to emit typing events only if socket exists
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (!activeConversationId) return;
    if (!socket) {
      console.warn("Socket not connected. Cannot send typing event.");
      return;
    }
    sendTyping(activeConversationId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (socket) {
        sendStopTyping(activeConversationId);
      }
    }, 2000);
  };

  // Handle send message with optimistic update
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeConversationId) return;
    setIsSendingMessage(true);
    try {
      const newMsg = {
        _id: Date.now().toString(),
        text: message,
        sender: user,
        createdAt: new Date().toISOString(),
        status: "sent",
      };
      setMessages((prev) => [...prev, newMsg]);
      await messageAPI.sendMessage(activeConversationId, message);
      setMessage("");
      refetchConversations();
      fetchMessages(activeConversationId);
      if (socket) {
        sendStopTyping(activeConversationId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Create new conversation using a selected user
  const createNewConversation = async (otherUserId: string) => {
    try {
      const response = await messageAPI.createConversation([otherUserId]);
      const newConv = response.data;
      selectConversation(newConv._id);
      toast.success("New conversation created");
      refetchConversations();
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  // Format time for conversation header
  const formatConversationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) {
      return format(date, "h:mm a");
    } else if (diffInDays < 7) {
      return format(date, "EEE");
    } else {
      return format(date, "MMM d");
    }
  };

  // Helper: Determine if this message is the last in a series from the same sender
  const isLastMessageFromSender = (index: number) => {
    if (index === messages.length - 1) return true;
    return messages[index + 1].sender._id !== messages[index].sender._id;
  };

  // Socket listeners for realtime typing, online/offline, and message status
  useEffect(() => {
    if (!socket || !activeConversationId) return;

    const otherUser = getOtherParticipant(activeConversation);
    // Listen for typing events from the other user
    socket.on("userTyping", (data: { conversationId: string; userId: string }) => {
      if (
        data.conversationId === activeConversationId &&
        data.userId === otherUser?._id
      ) {
        setIsTyping(true);
      }
    });
    socket.on("userStopTyping", (data: { conversationId: string; userId: string }) => {
      if (
        data.conversationId === activeConversationId &&
        data.userId === otherUser?._id
      ) {
        setIsTyping(false);
      }
    });
    // Online/offline events
    socket.on("userOnline", (data: { userId: string }) => {
      if (data.userId === otherUser?._id) {
        setOtherUserStatus("online");
      }
    });
    socket.on("userOffline", (data: { userId: string }) => {
      if (data.userId === otherUser?._id) {
        setOtherUserStatus("offline");
      }
    });
    // Example message status event (adjust if your backend uses a different event name)
    socket.on("messageStatus", (data: { messageId: string; status: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    });

    return () => {
      socket.off("userTyping");
      socket.off("userStopTyping");
      socket.off("userOnline");
      socket.off("userOffline");
      socket.off("messageStatus");
    };
  }, [socket, activeConversationId, activeConversation]);

  // Listen for new messages
  useEffect(() => {
    if (!socket || !activeConversationId) return;
    const handleNewMessage = (newMsg: any) => {
      if (newMsg.conversation === activeConversationId) {
        setMessages((prev) => [...prev, newMsg]);
      }
      refetchConversations();
    };
    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, activeConversationId, refetchConversations]);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* LEFT COLUMN with Tabs */}
      <div className="w-full md:w-1/3 border-r flex flex-col">
        {/* Tab Header */}
        <div className="flex border-b">
          <button
            className={cn(
              "py-2 px-4 flex-1 text-center font-medium",
              activeTab === "conversations" && "border-b-2 border-black"
            )}
            onClick={() => setActiveTab("conversations")}
          >
            Conversations
          </button>
          <button
            className={cn(
              "py-2 px-4 flex-1 text-center font-medium",
              activeTab === "users" && "border-b-2 border-black"
            )}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
        </div>

        {activeTab === "conversations" ? (
          <>
            {/* Conversations Tab Content */}
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h2 className="font-semibold">Messages</h2>
              <Button variant="ghost" size="icon">
                <Pencil size={20} />
              </Button>
            </div>
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search"
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {conversationsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4">
                  <p className="text-gray-500">No conversations found</p>
                  <Button className="mt-4" onClick={() => refetchConversations()}>
                    Refresh Conversations
                  </Button>
                </div>
              ) : (
                conversations.map((conv: any) => {
                  const other = getOtherParticipant(conv);
                  return (
                    <button
                      key={conv._id}
                      className={cn(
                        "w-full flex items-center p-4 hover:bg-gray-100 text-left",
                        activeConversationId === conv._id && "bg-gray-100"
                      )}
                      onClick={() => selectConversation(conv._id)}
                    >
                      <Avatar>
                        <AvatarImage
                          src={formatImageUrl(other?.profileImage)}
                          alt={other?.username}
                        />
                        <AvatarFallback>
                          {other?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3 flex-1 truncate">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{other?.username}</span>
                          <span className="text-xs text-gray-500">
                            {conv.lastMessage
                              ? formatConversationTime(conv.lastMessage.createdAt)
                              : formatConversationTime(conv.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center truncate text-sm text-gray-500">
                          {conv.lastMessage && (
                            <Avatar className="mr-1 h-4 w-4">
                              <AvatarImage
                                src={formatImageUrl(
                                  conv.lastMessage.sender.profileImage
                                )}
                                alt={conv.lastMessage.sender.username}
                              />
                              <AvatarFallback>
                                {conv.lastMessage.sender.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span>
                            {conv.lastMessage
                              ? conv.lastMessage.text || "Media message"
                              : "No messages yet"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            {/* Users Tab Content */}
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h2 className="font-semibold">All Users</h2>
              <Button variant="ghost" size="icon" onClick={() => refetchUsers()}>
                <Pencil size={20} />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {usersLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : allUsers.length === 0 ? (
                <p className="text-gray-500">No users found</p>
              ) : (
                <div className="space-y-2">
                  {allUsers
                    .filter((u: any) => u._id !== user?._id)
                    .map((u: any) => (
                      <button
                        key={u._id}
                        className="flex items-center p-2 hover:bg-gray-100 rounded-md w-full text-left"
                        onClick={() => createNewConversation(u._id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={formatImageUrl(u.profileImage)}
                            alt={u.username}
                          />
                          <AvatarFallback>
                            {u.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="ml-2">{u.username}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* RIGHT COLUMN: Active Conversation */}
      <div className="hidden md:flex md:flex-col md:w-2/3">
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center">
                <div className="relative">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage
                      src={formatImageUrl(
                        getOtherParticipant(activeConversation)?.profileImage
                      )}
                      alt={getOtherParticipant(activeConversation)?.username}
                    />
                    <AvatarFallback>
                      {getOtherParticipant(activeConversation)?.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online/offline dot */}
                  <span
                    className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border border-white ${
                      otherUserStatus === "online" ? "bg-green-500" : "bg-gray-500"
                    }`}
                  ></span>
                </div>
                <div>
                  <h3 className="font-medium">
                    {getOtherParticipant(activeConversation)?.username}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {otherUserStatus === "online" ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Info size={20} />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg: any, index: number) => (
                    <div
                      key={msg._id}
                      className={cn(
                        "flex items-end",
                        msg.sender._id === user?._id ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.sender._id !== user?._id &&
                        isLastMessageFromSender(index) && (
                          <Avatar className="mr-2 h-6 w-6">
                            <AvatarImage
                              src={formatImageUrl(msg.sender.profileImage)}
                              alt={msg.sender.username}
                            />
                            <AvatarFallback>
                              {msg.sender.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          msg.sender._id === user?._id
                            ? "bg-blue-500 text-white rounded-br-none"
                            : "bg-gray-200 text-gray-800 rounded-bl-none"
                        )}
                      >
                        {msg.text && <p>{msg.text}</p>}
                        {msg.media && (
                          <img
                            src={formatImageUrl(msg.media)}
                            alt="Media"
                            className="mt-2 max-w-full rounded"
                          />
                        )}
                        <div className="flex justify-end items-center text-xs mt-1">
                          <span>{format(new Date(msg.createdAt), "h:mm a")}</span>
                          {msg.sender._id === user?._id && (
                            <span className="ml-1">
                              {msg.status === "read" ? (
                                <Check size={14} className="text-blue-500" />
                              ) : (
                                <Check size={14} className="text-gray-500" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-center mt-2">
                      <span className="text-sm text-gray-500">Typing...</span>
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input
                  value={message}
                  onChange={handleInputChange}
                  placeholder="Message..."
                  className="flex-1"
                  disabled={isSendingMessage}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || isSendingMessage}
                >
                  {isSendingMessage ? (
                    <Send size={18} className="opacity-50" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="mb-4 rounded-full bg-gray-200 h-16 w-16 flex items-center justify-center">
              <Send size={28} className="text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
            <p className="text-gray-500 mb-6 max-w-xs">
              Select a conversation or start a new one to begin chatting
            </p>
            <Button onClick={() => refetchConversations()}>
              Refresh Conversations
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
