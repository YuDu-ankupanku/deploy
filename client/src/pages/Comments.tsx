
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentAPI } from '@/services/api';
import { toast } from 'sonner';

const CommentsPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  // Fetch comments
  const { data, isLoading, error } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      if (!postId) return { comments: [] };
      try {
        const response = await commentAPI.getComments(postId);
        return response.data;
      } catch (error) {
        console.error('Error fetching comments:', error);
        return { comments: [] };
      }
    },
    enabled: !!postId
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) => 
      commentAPI.createComment(postId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setNewComment('');
    },
    onError: () => {
      toast.error('Failed to add comment');
    }
  });

  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentAPI.likeComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });
      const previousData = queryClient.getQueryData(['comments', postId]);
      
      // Optimistically update
      queryClient.setQueryData(['comments', postId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          comments: old.comments.map((comment: any) =>
            comment._id === commentId
              ? { 
                  ...comment, 
                  isLiked: true, 
                  likes: [...comment.likes, user?._id] 
                }
              : comment
          )
        };
      });
      
      return { previousData };
    },
    onError: (err, commentId, context) => {
      queryClient.setQueryData(['comments', postId], context?.previousData);
      toast.error('Failed to like comment');
    }
  });

  // Unlike comment mutation
  const unlikeCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentAPI.unlikeComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });
      const previousData = queryClient.getQueryData(['comments', postId]);
      
      // Optimistically update
      queryClient.setQueryData(['comments', postId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          comments: old.comments.map((comment: any) =>
            comment._id === commentId
              ? { 
                  ...comment, 
                  isLiked: false, 
                  likes: comment.likes.filter((id: string) => id !== user?._id) 
                }
              : comment
          )
        };
      });
      
      return { previousData };
    },
    onError: (err, commentId, context) => {
      queryClient.setQueryData(['comments', postId], context?.previousData);
      toast.error('Failed to unlike comment');
    }
  });

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleLikeComment = (commentId: string, isLiked: boolean) => {
    if (isLiked) {
      unlikeCommentMutation.mutate(commentId);
    } else {
      likeCommentMutation.mutate(commentId);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !postId) return;
    
    addCommentMutation.mutate({ postId, text: newComment });
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto h-full flex flex-col animate-fade-in">
        <div className="flex items-center p-4 border-b">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-xl font-semibold ml-4">Comments</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {Array(4).fill(0).map((_, index) => (
            <div key={index} className="flex gap-3 mb-6">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-4 mt-2">
                  <Skeleton className="h-2 w-10" />
                  <Skeleton className="h-2 w-8" />
                  <Skeleton className="h-2 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto h-full flex flex-col animate-fade-in">
        <div className="flex items-center p-4 border-b">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-xl font-semibold ml-4">Comments</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Error loading comments</p>
            <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['comments', postId] })}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const comments = data?.comments || [];

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center p-4 border-b">
        <Button variant="ghost" size="icon" onClick={handleGoBack}>
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-xl font-semibold ml-4">Comments</h1>
      </div>
      
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No comments yet</p>
          </div>
        ) : (
          comments.map((comment: any) => (
            <div key={comment._id} className="flex gap-3 mb-6">
              <Avatar className="h-10 w-10">
                <AvatarImage src={comment.user.profileImage} alt={comment.user.username} />
                <AvatarFallback>{comment.user.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="space-y-1">
                  <div>
                    <span className="font-medium text-sm mr-2">{comment.user.username}</span>
                    <span className="text-sm">{comment.text}</span>
                  </div>
                  
                  <div className="flex gap-4">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt), 'MMM d')}
                    </span>
                    {comment.likes.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {comment.likes.length} {comment.likes.length === 1 ? 'like' : 'likes'}
                      </span>
                    )}
                    <button 
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleLikeComment(comment._id, comment.likes.includes(user?._id))}
                    >
                      {comment.likes.includes(user?._id) ? 'Unlike' : 'Like'}
                    </button>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Comment Input */}
      <div className="border-t p-3">
        <form onSubmit={handleSubmitComment} className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImage} alt={user?.username} />
            <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="rounded-full bg-muted border-none"
          />
          
          <Button 
            type="submit" 
            size="sm" 
            variant="ghost" 
            className="text-primary"
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send size={20} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CommentsPage;
