
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Story } from '@/types/story';
import { Button } from '@/components/ui/button';

interface StoryContentProps {
  story: Story;
  videoRef: React.RefObject<HTMLVideoElement>;
  isLoaded: boolean;
  formatMediaUrl: (url: string) => string;
  handleVideoMetadata: () => void;
  handleVideoEnded: () => void;
  handleImageError: () => void;
}

const StoryContent: React.FC<StoryContentProps> = ({
  story,
  videoRef,
  isLoaded,
  formatMediaUrl,
  handleVideoMetadata,
  handleVideoEnded,
  handleImageError,
}) => {
  // Determine if media is video or image based on file extension
  const isVideo = story.media && 
    (story.media.endsWith('.mp4') || 
     story.media.endsWith('.mov') || 
     story.media.endsWith('.webm'));

  const mediaUrl = formatMediaUrl(story.media);

  return (
    <div className="w-full h-full flex items-center justify-center">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <Skeleton className="w-full h-full absolute inset-0" />
          <div className="z-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}

      {isVideo ? (
        <video 
          ref={videoRef}
          src={mediaUrl}
          className={`max-h-[80vh] max-w-full object-contain z-20 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          autoPlay
          playsInline
          muted={false}
          onLoadedMetadata={handleVideoMetadata}
          onEnded={handleVideoEnded}
          onError={handleImageError}
          controls={false}
        />
      ) : (
        <img 
          src={mediaUrl}
          alt="Story content"
          className={`max-h-[80vh] max-w-full object-contain z-20 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleVideoMetadata}
          onError={handleImageError}
        />
      )}

      {story.caption && isLoaded && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white z-25">
          <p>{story.caption}</p>
        </div>
      )}

      {!isLoaded && !mediaUrl && (
        <div className="text-white bg-black/50 p-4 rounded-md z-40">
          <p>Failed to load story content</p>
          <Button onClick={handleImageError} variant="outline" className="mt-2">
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

export default StoryContent;
