
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyAPI } from '@/services/api';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { UserStories, Story } from '@/types/story';

export const useStories = () => {
  const queryClient = useQueryClient();
  const initialFetchDone = useRef(false);

  // Fetch stories
  const { data: stories = [], isLoading, error, refetch } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      console.log('Fetching stories...');
      try {
        const response = await storyAPI.getStories();
        
        if (!response || !response.data || !Array.isArray(response.data)) {
          console.error('Invalid stories response format:', response);
          return [];
        }
        
        // Sort stories for each user by createdAt in ascending order (oldest first)
        const sortedStories = response.data.map((userStories: UserStories) => ({
          ...userStories,
          stories: Array.isArray(userStories.stories) 
            ? userStories.stories.sort((a: Story, b: Story) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              )
            : []
        }));
        
        // Filter out users with no stories
        const filteredStories = sortedStories.filter(user => 
          user.stories && user.stories.length > 0
        );
        
        console.log('Processed stories:', filteredStories);
        return filteredStories;
      } catch (error) {
        console.error('Error fetching stories:', error);
        toast.error('Failed to load stories. Please try again later.');
        return [];
      }
    },
    staleTime: 60000, // Increase stale time to 1 minute to reduce refetches
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent spam
    refetchOnMount: true,
    retry: 1, // Reduce retries to prevent excessive API calls
    refetchInterval: false // Disable automatic refetching
  });

  // Force refresh stories on mount but only once
  useEffect(() => {
    if (!initialFetchDone.current) {
      refetch().then(() => {
        initialFetchDone.current = true;
      });
    }
  }, [refetch]);

  // View story
  const viewStoryMutation = useMutation({
    mutationFn: (storyId: string) => {
      console.log('Viewing story with ID:', storyId);
      return storyAPI.viewStory(storyId);
    },
    onMutate: async (storyId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['stories'] });

      // Snapshot the current value
      const previousStories = queryClient.getQueryData(['stories']);

      // Optimistically update to the new value
      queryClient.setQueryData(['stories'], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        
        return old.map((userStory: UserStories) => ({
          ...userStory,
          stories: userStory.stories.map((story: Story) =>
            story._id === storyId
              ? { ...story, hasViewed: true }
              : story
          )
        }));
      });

      return { previousStories };
    },
    onError: (err, storyId, context) => {
      console.error('Error marking story as viewed:', err);
      
      // Rollback on error
      if (context?.previousStories) {
        queryClient.setQueryData(['stories'], context.previousStories);
      }
    }
  });

  // Create story
  const createStoryMutation = useMutation({
    mutationFn: (formData: FormData) => storyAPI.createStory(formData),
    onSuccess: () => {
      toast.success('Story created successfully');
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
    onError: (error) => {
      console.error('Error creating story:', error);
      toast.error('Failed to create story');
    }
  });

  // Delete story
  const deleteStoryMutation = useMutation({
    mutationFn: (storyId: string) => storyAPI.deleteStory(storyId),
    onSuccess: () => {
      toast.success('Story deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
    onError: () => {
      toast.error('Failed to delete story');
    }
  });

  // View a story
  const viewStory = (storyId: string) => {
    if (!storyId) {
      console.error('Invalid story ID for viewing');
      return;
    }
    viewStoryMutation.mutate(storyId);
  };

  // Create a story
  const createStory = (formData: FormData) => {
    createStoryMutation.mutate(formData);
  };

  // Delete a story
  const deleteStory = (storyId: string) => {
    deleteStoryMutation.mutate(storyId);
  };

  return {
    stories: Array.isArray(stories) ? stories : [],
    isLoading,
    error,
    refetch,
    viewStory,
    createStory,
    deleteStory
  };
};
