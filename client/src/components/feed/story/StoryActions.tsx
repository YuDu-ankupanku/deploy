
import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Story } from '@/types/story';
import { useAuth } from '@/contexts/AuthContext';
import { useStories } from '@/hooks/useStories';

interface StoryActionsProps {
  story: Story;
}

const StoryActions: React.FC<StoryActionsProps> = ({ story }) => {
  const { user } = useAuth();
  const { deleteStory } = useStories();
  
  const isOwnStory = user?._id === story.user?._id;

  const handleDeleteStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (story._id) {
      deleteStory(story._id);
      toast.success("Story deleted successfully");
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 backdrop-blur-sm bg-black/30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Reply to story..."
            className="w-full bg-white/10 text-white rounded-full py-2 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-white/20"
            onClick={(e) => {
              e.stopPropagation();
              toast.info("Replies are not implemented yet");
            }}
          />
          <Send 
            size={16} 
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70" 
          />
        </div>
        
        <div className="flex gap-2">
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
          
          {isOwnStory && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full bg-destructive/80 hover:bg-destructive text-white"
              onClick={handleDeleteStory}
            >
              <Trash2 size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryActions;
