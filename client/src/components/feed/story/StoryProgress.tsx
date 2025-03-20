
import React from 'react';

export interface StoryProgressProps {
  progress: number;
  isPaused: boolean;
  pauseStory: () => void;
  playStory: () => void;
}

const StoryProgress: React.FC<StoryProgressProps> = ({ progress, isPaused, pauseStory, playStory }) => {
  return (
    <div className="absolute top-4 left-0 right-0 z-40 px-4">
      <div 
        className="w-full h-1 bg-white/30 rounded-full overflow-hidden"
        onTouchStart={pauseStory}
        onTouchEnd={playStory}
        onMouseDown={pauseStory}
        onMouseUp={playStory}
      >
        <div 
          className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};

export default StoryProgress;
