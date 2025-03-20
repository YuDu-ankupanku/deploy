
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import StoryViewer from './StoryViewer';
import CreateStory from './CreateStory';
import { useStories } from '@/hooks/useStories';
import { UserStories } from '@/types/story';

const Stories = () => {
  const { stories, isLoading, refetch } = useStories();
  const [openViewer, setOpenViewer] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  
  useEffect(() => {
    // Fetch stories on mount
    refetch();
  }, [refetch]);

  // Format image URL to ensure it works properly
  const formatImageUrl = (url: string) => {
    if (!url) return '';
    
    // If it's already a fully qualified URL
    if (url.startsWith('http')) return url;
    
    // For server-hosted images, append API base URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = apiBaseUrl.replace('/api', '');
    
    // Handle both uploads/file.jpg and uploads\file.jpg formats
    const normalizedUrl = url.replace(/\\/g, '/');
    
    return `${baseUrl}/${normalizedUrl.startsWith('/') ? normalizedUrl.substring(1) : normalizedUrl}`;
  };

  const viewStory = (storyId: string) => {
    setSelectedStoryId(storyId);
    setOpenViewer(true);
  };

  const closeStoryViewer = () => {
    setOpenViewer(false);
  };
  
  const handleStoryCreated = () => {
    refetch();
  };

  // Check if there are any stories available
  const hasStories = stories && Array.isArray(stories) && stories.length > 0;

  return (
    <div className="mb-6 mt-2">
      <div className="overflow-x-auto py-2 px-1 no-scrollbar">
        <div className="flex space-x-4 pb-2">
          {/* Create Story button */}
          <CreateStory onStoryCreated={handleStoryCreated} />
          
          {/* Stories */}
          {isLoading ? (
            // Loading skeletons
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-1 min-w-16">
                <div className="w-16 h-16 relative rounded-full overflow-hidden">
                  <Skeleton className="absolute inset-0 rounded-full" />
                </div>
                <Skeleton className="w-12 h-3" />
              </div>
            ))
          ) : hasStories ? (
            stories.map((userStory: UserStories) => {
              // Skip users with no stories
              if (!userStory.stories || userStory.stories.length === 0) return null;
              
              // Stories are already sorted by createdAt in ascending order (oldest first) in useStories hook
              // Get the first non-viewed story for this user
              const firstUnviewedStory = userStory.stories.find(story => !story.hasViewed);
              // If all stories are viewed, use the first story (oldest)
              const storyToShow = firstUnviewedStory || userStory.stories[0];
              
              // Determine if user has any unviewed stories
              const hasUnviewedStories = userStory.stories.some(story => !story.hasViewed);
              
              return (
                <div 
                  key={userStory._id} 
                  className="flex flex-col items-center space-y-1 min-w-16 cursor-pointer"
                  onClick={() => viewStory(storyToShow._id)}
                >
                  <div className={`w-16 h-16 rounded-full overflow-hidden relative flex items-center justify-center
                    ${hasUnviewedStories 
                      ? 'p-[2px] bg-gradient-to-br from-pink-500 to-purple-600' 
                      : 'p-[2px] bg-gray-300 dark:bg-gray-700'}`
                  }>
                    <div className="bg-white dark:bg-black rounded-full p-0.5 w-full h-full flex items-center justify-center overflow-hidden">
                      <Avatar className="w-full h-full rounded-full border-none">
                        <AvatarImage src={formatImageUrl(userStory.profileImage)} alt={userStory.username} />
                        <AvatarFallback>{userStory.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <p className="text-xs truncate max-w-16">{userStory.username}</p>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center w-full py-4">
              <p className="text-sm text-muted-foreground">No stories available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Story Viewer Modal */}
      {openViewer && selectedStoryId && (
        <StoryViewer
          isOpen={openViewer}
          onClose={closeStoryViewer}
          initialStoryId={selectedStoryId}
          allStories={Array.isArray(stories) ? stories : []}
        />
      )}
    </div>
  );
};

export default Stories;
