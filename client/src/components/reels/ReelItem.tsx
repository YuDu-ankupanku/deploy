
import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Heart, MessageCircle, Bookmark, MoreHorizontal } from 'lucide-react';
import { Reel } from './ReelsList';

interface ReelItemProps {
  reel: Reel;
  onPrevious: () => void;
  onNext: () => void;
  onLike: () => void;
  onSave: () => void;
}

const ReelItem: React.FC<ReelItemProps> = ({ 
  reel, 
  onPrevious, 
  onNext,
  onLike,
  onSave
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset and play video when reel changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  }, [reel.id]);

  return (
    <div className="relative h-full bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video}
        className="h-full w-full object-contain"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Overlay controls */}
      <div className="absolute inset-0 flex">
        {/* Left area for previous */}
        <div 
          className="w-1/3 h-full" 
          onClick={onPrevious}
        />
        
        {/* Middle area */}
        <div className="w-1/3 h-full" />
        
        {/* Right area for next */}
        <div 
          className="w-1/3 h-full" 
          onClick={onNext}
        />
      </div>

      {/* User info */}
      <div className="absolute bottom-20 left-4 right-4">
        <div className="flex items-center">
          <img 
            src={reel.user.avatar} 
            alt={reel.user.username} 
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <span className="ml-2 font-semibold text-white">
            {reel.user.username}
          </span>
          <Button variant="ghost" size="sm" className="text-white ml-2">
            Follow
          </Button>
        </div>
        <p className="text-white mt-2">{reel.caption}</p>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-32 right-4 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white"
            onClick={onLike}
          >
            <Heart 
              size={28} 
              fill={reel.liked ? "white" : "none"} 
              className={reel.liked ? "text-red-500" : "text-white"} 
            />
          </Button>
          <span className="text-white text-xs">{reel.likes}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <Button variant="ghost" size="icon" className="text-white">
            <MessageCircle size={28} />
          </Button>
          <span className="text-white text-xs">{reel.comments}</span>
        </div>
        
        <Button variant="ghost" size="icon" className="text-white">
          <Send size={28} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white"
          onClick={onSave}
        >
          <Bookmark 
            size={28} 
            fill={reel.saved ? "white" : "none"} 
          />
        </Button>
        
        <Button variant="ghost" size="icon" className="text-white">
          <MoreHorizontal size={28} />
        </Button>
      </div>
    </div>
  );
};

export default ReelItem;
