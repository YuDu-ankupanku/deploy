
import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Send, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useStories } from '@/hooks/useStories';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { UserStories, Story } from '@/types/story';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface StoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  initialStoryId: string;
  allStories: UserStories[];
}

const STORY_DURATION = 5000;

const StoryViewer: React.FC<StoryViewerProps> = ({
  isOpen,
  onClose,
  initialStoryId,
  allStories,
}) => {
  const [activeUserIndex, setActiveUserIndex] = useState<number>(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const progressIntervalRef = useRef<number | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const { viewStory, deleteStory } = useStories();
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Effect for finding the initial story
  useEffect(() => {
    if (!initialStoryId || !Array.isArray(allStories) || allStories.length === 0) return;

    let foundUserIndex = -1;
    let foundStoryIndex = -1;

    for (let i = 0; i < allStories.length; i++) {
      const userStories = allStories[i];
      const storyIndex = userStories.stories.findIndex(story => story._id === initialStoryId);
      
      if (storyIndex !== -1) {
        foundUserIndex = i;
        foundStoryIndex = storyIndex;
        break;
      }
    }

    if (foundUserIndex !== -1 && foundStoryIndex !== -1) {
      setActiveUserIndex(foundUserIndex);
      setActiveStoryIndex(foundStoryIndex);
    } else {
      console.error('Could not find story with ID:', initialStoryId);
    }
  }, [initialStoryId, allStories]);

  // Update isPaused when the delete dialog is shown
  useEffect(() => {
    setIsPaused(showDeleteDialog);
  }, [showDeleteDialog]);

  const formatMediaUrl = (url: string) => {
    if (!url) return '';
    
    if (url.startsWith('http')) return url;
    
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = apiBaseUrl.replace('/api', '');
    
    const normalizedUrl = url.replace(/\\/g, '/');
    
    return `${baseUrl}/${normalizedUrl.startsWith('/') ? normalizedUrl.substring(1) : normalizedUrl}`;
  };

  // Story timer effect
  useEffect(() => {
    if (!isOpen || !isImageLoaded) return;
    
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    
    setProgress(0);
    
    if (!isPaused) {
      progressIntervalRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            return 100;
          }
          return prev + (100 / (STORY_DURATION / 100));
        });
      }, 100);
      
      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        goToNextStory();
      }, STORY_DURATION);
    }
    
    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [isOpen, activeUserIndex, activeStoryIndex, isPaused, isImageLoaded]);

  // Mark story as viewed
  useEffect(() => {
    if (!isOpen || !allStories || activeUserIndex < 0 || activeStoryIndex < 0) return;
    
    try {
      const currentStory = allStories[activeUserIndex]?.stories[activeStoryIndex];
      if (currentStory && !currentStory.hasViewed) {
        viewStory(currentStory._id);
      }
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  }, [isOpen, activeUserIndex, activeStoryIndex, allStories, viewStory]);

  const goToPreviousStory = () => {
    setIsImageLoaded(false);
    setProgress(0);
    
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else if (activeUserIndex > 0) {
      const prevUserIndex = activeUserIndex - 1;
      const prevUserStoriesCount = allStories[prevUserIndex].stories.length;
      setActiveUserIndex(prevUserIndex);
      setActiveStoryIndex(prevUserStoriesCount - 1);
    } else {
      const lastUserIndex = allStories.length - 1;
      const lastUserStoriesCount = allStories[lastUserIndex].stories.length;
      setActiveUserIndex(lastUserIndex);
      setActiveStoryIndex(lastUserStoriesCount - 1);
    }
  };

  const goToNextStory = () => {
    setIsImageLoaded(false);
    setProgress(0);
    
    if (activeStoryIndex < allStories[activeUserIndex].stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else if (activeUserIndex < allStories.length - 1) {
      setActiveUserIndex(activeUserIndex + 1);
      setActiveStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    const currentStory = allStories[activeUserIndex]?.stories[activeStoryIndex];
    
    if (currentStory && currentStory._id) {
      deleteStory(currentStory._id);
      // Toast is now only shown in the deleteStory function in useStories hook
      
      if (allStories[activeUserIndex].stories.length === 1) {
        if (allStories.length === 1) {
          onClose();
        } else {
          if (activeUserIndex < allStories.length - 1) {
            setActiveUserIndex(activeUserIndex + 1);
            setActiveStoryIndex(0);
          } else {
            onClose();
          }
        }
      } else {
        goToNextStory();
      }
    }
    setShowDeleteDialog(false);
  };

  const handleMouseDown = () => {
    setIsPaused(true);
  };

  const handleMouseUp = () => {
    setIsPaused(false);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getFormattedTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'recently';
    }
  };

  const currentUserStories = allStories[activeUserIndex] || null;
  const currentStory = currentUserStories?.stories[activeStoryIndex] || null;

  if (!isOpen || !currentUserStories || !currentStory) {
    return null;
  }

  const isOwnStory = user?._id === currentUserStories._id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full sm:max-w-2xl h-[600px] max-h-[90vh] bg-black text-white overflow-hidden">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          {isOwnStory && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 rounded-full bg-destructive/80 hover:bg-destructive text-white"
              onClick={handleDeleteClick}
              aria-label="Delete story"
            >
              <Trash2 size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={onClose}
            aria-label="Close story viewer"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="absolute top-0 left-0 right-0 z-50 px-2 pt-2 flex gap-1">
          {currentUserStories.stories.map((_, idx) => (
            <div 
              key={idx} 
              className="h-1 bg-gray-600 flex-1 rounded-full overflow-hidden"
            >
              <div 
                className={`h-full bg-white transition-all duration-100 ${
                  idx < activeStoryIndex ? 'w-full' : 
                  idx === activeStoryIndex ? '' : 'w-0'
                }`}
                style={{ width: idx === activeStoryIndex ? `${progress}%` : '' }}
              ></div>
            </div>
          ))}
        </div>
        
        <div className="absolute top-4 left-4 z-40 flex items-center">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-white">
              <AvatarImage src={formatMediaUrl(currentUserStories.profileImage || '')} />
              <AvatarFallback>{getInitials(currentUserStories.username)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-bold">{currentUserStories.username}</span>
              <span className="text-xs opacity-80">
                {getFormattedTime(currentStory.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div 
          className="flex-1 flex items-center justify-center w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img 
              src={formatMediaUrl(currentStory.media)} 
              alt={currentStory.caption || "Story"}
              className="w-full h-full object-contain"
              onLoad={() => setIsImageLoaded(true)}
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none"></div>
          
          {currentStory.caption && (
            <div className="absolute bottom-20 left-0 right-0 text-center px-6 z-10">
              <p className="text-white text-base font-medium drop-shadow-md">
                {currentStory.caption}
              </p>
            </div>
          )}
          
          <button 
            className="absolute left-0 top-0 bottom-0 w-1/3 h-full cursor-pointer focus:outline-none z-10"
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousStory();
            }}
            aria-label="Previous story"
          >
            <ChevronLeft className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-70" size={32} />
          </button>
          
          <button 
            className="absolute right-0 top-0 bottom-0 w-1/3 h-full cursor-pointer focus:outline-none z-10"
            onClick={(e) => {
              e.stopPropagation();
              goToNextStory();
            }}
            aria-label="Next story"
          >
            <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-70" size={32} />
          </button>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Reply to story..."
              className="bg-white/10 text-white rounded-full py-2 px-4 pr-12 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                toast.info("Replies are not implemented yet");
              }}
            />
            <Send 
              size={16} 
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white" 
            />
          </div>
          
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Liked the story!");
              }}
            >
              <Heart size={18} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={(e) => {
                e.stopPropagation();
                toast.info("Direct messages are not implemented yet");
              }}
            >
              <MessageCircle size={18} />
            </Button>
          </div>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Story</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this story? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default StoryViewer;
