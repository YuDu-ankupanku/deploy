import React, { useEffect } from 'react';
import { Settings, Grid, Bookmark, Heart, UserCheck, UserPlus, MessageSquare, Loader2, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useFollow } from '@/hooks/useFollow';
import { useNavigate } from 'react-router-dom';

interface ProfileHeaderProps {
  username: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isCurrentUser: boolean;
  userId?: string;
  isPrivate?: boolean;
  isFollowing?: boolean;
  hasFollowRequest?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  username,
  fullName,
  avatarUrl,
  bio,
  postsCount,
  followersCount,
  followingCount,
  isCurrentUser,
  userId = '',
  isPrivate = false,
  isFollowing = false,
  hasFollowRequest = false,
}) => {
  const { 
    followStatus, 
    setFollowStatus, 
    followUser, 
    unfollowUser,
    cancelFollowRequest,
    setupSocketListeners,
    cleanupSocketListeners
  } = useFollow();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isFollowing) {
      setFollowStatus('following');
    } else if (hasFollowRequest) {
      setFollowStatus('requested');
    } else {
      setFollowStatus('not_following');
    }
    setupSocketListeners();
    return () => {
      cleanupSocketListeners();
    };
  }, [isFollowing, hasFollowRequest, setFollowStatus, setupSocketListeners, cleanupSocketListeners]);
  
  const handleFollowAction = async () => {
    if (followStatus === 'following') {
      await unfollowUser(userId, username);
    } else if (followStatus === 'requested') {
      await cancelFollowRequest(userId, username);
    } else if (followStatus === 'not_following') {
      await followUser(userId, username, isPrivate);
    }
  };
  
  const renderFollowButton = () => {
    if (followStatus === 'loading') {
      return (
        <Button disabled className="flex items-center gap-1">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading</span>
        </Button>
      );
    }
    if (followStatus === 'following') {
      return (
        <Button variant="outline" onClick={handleFollowAction} className="flex items-center gap-1">
          <UserCheck size={16} />
          <span>Following</span>
        </Button>
      );
    }
    if (followStatus === 'requested') {
      return (
        <Button variant="outline" onClick={handleFollowAction} className="flex items-center gap-1">
          <Clock size={16} />
          <span>Requested</span>
        </Button>
      );
    }
    return (
      <Button onClick={handleFollowAction} className="flex items-center gap-1">
        <UserPlus size={16} />
        <span>Follow</span>
      </Button>
    );
  };

  const handleMessage = () => {
    navigate(`/messages?username=${username}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
        <Avatar className="h-24 w-24 md:h-36 md:w-36">
          {/* Use the already formatted avatarUrl */}
          <AvatarImage src={avatarUrl} alt={username} />
          <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="space-y-4 text-center md:text-left flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">{username}</h1>
            {isCurrentUser ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/settings')}>
                  Edit Profile
                </Button>
                <Button variant="ghost" size="icon">
                  <Settings size={20} />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                {renderFollowButton()}
                <Button variant="outline" onClick={handleMessage}>
                  <MessageSquare size={16} className="mr-1" />
                  <span>Message</span>
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-center md:justify-start space-x-6">
            <div className="text-center md:text-left">
              <span className="font-semibold">{postsCount}</span>
              <span className="text-muted-foreground ml-1">posts</span>
            </div>
            <div className="text-center md:text-left">
              <span className="font-semibold">{followersCount}</span>
              <span className="text-muted-foreground ml-1">followers</span>
            </div>
            <div className="text-center md:text-left">
              <span className="font-semibold">{followingCount}</span>
              <span className="text-muted-foreground ml-1">following</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-medium">{fullName}</p>
            <p className="text-sm whitespace-pre-line">{bio}</p>
            {isPrivate && !isCurrentUser && !isFollowing && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                This account is private
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
