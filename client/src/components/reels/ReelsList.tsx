
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Heart, MessageCircle, Bookmark, MoreHorizontal } from 'lucide-react';
import ReelItem from './ReelItem';
import { useReels } from '@/hooks/use-reels';

export interface Reel {
  id: string;
  user: {
    username: string;
    avatar: string;
  };
  video: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: Date;
  liked?: boolean;
  saved?: boolean;
}

const ReelsList = () => {
  const { reels: apiReels, isLoading, handleLikeReel, handleSaveReel } = useReels();
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  
  // Transform API reels to our Reel format
  const reels: Reel[] = apiReels.map(reel => ({
    id: reel.id,
    user: {
      username: reel.username,
      avatar: reel.userAvatar
    },
    video: reel.videoUrl,
    caption: reel.caption,
    likes: reel.likes,
    comments: reel.comments,
    timestamp: new Date(reel.timestamp),
    liked: reel.liked,
    saved: reel.saved
  }));
  
  const handleNext = () => {
    setCurrentReelIndex((prev) => (prev < reels.length - 1 ? prev + 1 : prev));
  };

  const handlePrevious = () => {
    setCurrentReelIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };
  
  if (isLoading || reels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  const currentReel = reels[currentReelIndex];

  return (
    <div className="h-full overflow-hidden">
      <ReelItem 
        reel={currentReel}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onLike={() => handleLikeReel(currentReel.id, !!currentReel.liked)}
        onSave={() => handleSaveReel(currentReel.id, !!currentReel.saved)}
      />
      
      {/* Progress bar */}
      <div className="absolute top-2 left-0 right-0 flex gap-1 px-2 z-10">
        {reels.map((_, index) => (
          <div 
            key={index} 
            className={`h-0.5 flex-1 ${index === currentReelIndex ? 'bg-white' : 'bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ReelsList;
