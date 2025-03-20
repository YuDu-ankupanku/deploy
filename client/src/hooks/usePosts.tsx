import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postAPI } from '@/services/api';
import { toast } from 'sonner';

interface User {
  _id: string;
  username: string;
  profileImage: string;
}

interface Post {
  _id: string;
  user: User;
  media: string[]; // Array of media paths
  caption?: string;
  location?: string;
  likes: string[];
  comments: string[];
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

interface PostsResponse {
  posts: Post[];
  hasMore: boolean;
  page: number;
}

export const usePosts = () => {
  const queryClient = useQueryClient();

  // Fetch feed posts with infinite loading
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }) => {
      const response = await postAPI.getFeedPosts(pageParam as number);
      console.log('Feed response:', response.data);
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      return lastPage.hasMore ? (lastPage.page || 0) + 1 : undefined;
    },
    staleTime: 1000 * 30, // 30 seconds - reduced for more frequent refreshes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Like a post
  const likeMutation = useMutation({
    mutationFn: (postId: string) => postAPI.likePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previousData = queryClient.getQueryData(['feed']);
      const auth = queryClient.getQueryData(['auth']) as any;
      const currentUserId = auth?.user?._id;
      queryClient.setQueryData(['feed'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: Post) =>
              post._id === postId
                ? {
                    ...post,
                    isLiked: true,
                    likes: currentUserId
                      ? [...post.likes, currentUserId]
                      : [...post.likes, 'currentUser']
                  }
                : post
            )
          }))
        };
      });
      return { previousData };
    },
    onError: (err, postId, context) => {
      console.error('Error liking post:', err);
      if (context?.previousData) {
        queryClient.setQueryData(['feed'], context.previousData);
      }
      toast.error('Failed to like post. Please try again.');
    },
    onSuccess: () => {
      toast.success('Post liked');
    }
  });

  // Unlike a post
  const unlikeMutation = useMutation({
    mutationFn: (postId: string) => postAPI.unlikePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previousData = queryClient.getQueryData(['feed']);
      const auth = queryClient.getQueryData(['auth']) as any;
      const currentUserId = auth?.user?._id;
      queryClient.setQueryData(['feed'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: Post) =>
              post._id === postId
                ? {
                    ...post,
                    isLiked: false,
                    likes: post.likes.filter(id => id !== currentUserId && id !== 'currentUser')
                  }
                : post
            )
          }))
        };
      });
      return { previousData };
    },
    onError: (err, postId, context) => {
      console.error('Error unliking post:', err);
      if (context?.previousData) {
        queryClient.setQueryData(['feed'], context.previousData);
      }
      toast.error('Failed to unlike post. Please try again.');
    },
    onSuccess: () => {
      toast.success('Post unliked');
    }
  });

  // Save a post
  const saveMutation = useMutation({
    mutationFn: (postId: string) => postAPI.savePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previousData = queryClient.getQueryData(['feed']);
      queryClient.setQueryData(['feed'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: Post) =>
              post._id === postId ? { ...post, isSaved: true } : post
            )
          }))
        };
      });
      return { previousData };
    },
    onError: (err, postId, context) => {
      console.error('Error saving post:', err);
      if (context?.previousData) {
        queryClient.setQueryData(['feed'], context.previousData);
      }
      toast.error('Failed to save post. Please try again.');
    },
    onSuccess: () => {
      toast.success('Post saved');
    }
  });

  // Unsave a post
  const unsaveMutation = useMutation({
    mutationFn: (postId: string) => postAPI.unsavePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previousData = queryClient.getQueryData(['feed']);
      queryClient.setQueryData(['feed'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: Post) =>
              post._id === postId ? { ...post, isSaved: false } : post
            )
          }))
        };
      });
      return { previousData };
    },
    onError: (err, postId, context) => {
      console.error('Error unsaving post:', err);
      if (context?.previousData) {
        queryClient.setQueryData(['feed'], context.previousData);
      }
      toast.error('Failed to unsave post. Please try again.');
    },
    onSuccess: () => {
      toast.success('Post unsaved');
    }
  });

  // Delete a post - updated to use async handling
  const deleteMutation = useMutation({
    mutationFn: (postId: string) => postAPI.deletePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previousData = queryClient.getQueryData(['feed']);
      queryClient.setQueryData(['feed'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((post: Post) => post._id !== postId)
          }))
        };
      });
      return { previousData };
    },
    onError: (err, postId, context) => {
      console.error('Error deleting post:', err);
      if (context?.previousData) {
        queryClient.setQueryData(['feed'], context.previousData);
      }
      toast.error('Failed to delete post. Please try again.');
    },
    onSuccess: () => {
      toast.success('Post deleted successfully');
    },
    onSettled: () => {
      // Invalidate after a short delay to allow optimistic update to settle
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      }, 500);
    }
  });

  // Helper functions for actions
  const toggleLike = (postId: string, isLiked: boolean) => {
    console.log('Toggling like for post:', postId, 'Current state:', isLiked);
    if (isLiked) {
      unlikeMutation.mutate(postId);
    } else {
      likeMutation.mutate(postId);
    }
  };

  const toggleSave = (postId: string, isSaved: boolean) => {
    console.log('Toggling save for post:', postId, 'Current state:', isSaved);
    if (isSaved) {
      unsaveMutation.mutate(postId);
    } else {
      saveMutation.mutate(postId);
    }
  };

  // Updated deletePost helper to use mutateAsync
  const deletePost = async (postId: string) => {
    console.log('Deleting post:', postId);
    return await deleteMutation.mutateAsync(postId);
  };

  // Get all posts in a flat array with proper media handling
  const posts = data?.pages.flatMap(page => {
    return page.posts.map(post => {
      let mediaArray = post.media || [];
      // Fallback in case post.image exists
      if ((!mediaArray || mediaArray.length === 0) && (post as any).image) {
        mediaArray = [(post as any).image];
      }
      return {
        ...post,
        media: mediaArray
      };
    });
  }) || [];

  console.log('Processed posts:', posts);

  return {
    posts,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    toggleLike,
    toggleSave,
    deletePost
  };
};
