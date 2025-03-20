
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export interface StoryHeaderProps {
  username: string;
  profileImage: string;
  timeAgo: string;
}

const StoryHeader: React.FC<StoryHeaderProps> = ({ username, profileImage, timeAgo }) => {
  return (
    <div className="flex items-center gap-2 p-4 absolute top-0 left-0 right-0 z-40">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profileImage} alt={username} />
        <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="text-white">
        <p className="font-semibold text-sm">{username}</p>
        <p className="text-xs opacity-80">{timeAgo}</p>
      </div>
    </div>
  );
};

export default StoryHeader;
