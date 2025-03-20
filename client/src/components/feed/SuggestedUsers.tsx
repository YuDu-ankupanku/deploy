
import React, { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userAPI } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { formatImageUrl } from '@/services/api';
import { useFollow } from '@/hooks/useFollow';
import { UserPlus, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

interface SuggestedUser {
  _id: string;
  username: string;
  fullName: string;
  profileImage?: string;
  isPrivate?: boolean;
}

const SuggestedUsers = () => {
  const { data: suggestions, isLoading, refetch, error } = useQuery({
    queryKey: ['suggested-users'],
    queryFn: async () => {
      try {
        // Try the user suggestions endpoint first
        console.log('Fetching suggested users...');
        const response = await userAPI.getSuggestions();
        console.log('Suggested users response:', response.data);
        
        if (!response.data || response.data.length === 0) {
          // If no suggestions, fall back to all users
          console.log('No suggestions found, fetching all users instead');
          const allUsersResponse = await userAPI.getAllUsers();
          console.log('All users response:', allUsersResponse.data);
          return allUsersResponse.data;
        }
        
        return response.data;
      } catch (error) {
        console.error('Error fetching suggested users:', error);
        toast.error('Failed to load user suggestions');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { followUser } = useFollow();

  // Log data for debugging
  useEffect(() => {
    if (suggestions) {
      console.log('Rendered suggestions:', suggestions);
    }
  }, [suggestions]);

  const handleFollow = async (userId: string, username: string, isPrivate = false) => {
    await followUser(userId, username, isPrivate);
    // Force refetch users to update UI immediately
    refetch();
  };

  const handleRefresh = () => {
    toast.info('Refreshing user suggestions...');
    refetch();
  };

  // Show skeleton loading state
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold flex items-center gap-1.5 text-sm">
            <Users size={16} />
            <span>People you may know</span>
          </h3>
          <Button variant="ghost" size="icon" disabled className="h-7 w-7">
            <RefreshCw size={14} />
          </Button>
        </div>
        {Array(5).fill(0).map((_, index) => (
          <div key={index} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div>
                <Skeleton className="h-3 w-20 mb-1.5" />
                <Skeleton className="h-2 w-24" />
              </div>
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  // Show error state if there was an error fetching users
  if (error) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold flex items-center gap-1.5 text-sm">
            <Users size={16} />
            <span>People you may know</span>
          </h3>
          <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-7 w-7">
            <RefreshCw size={14} />
          </Button>
        </div>
        <div className="text-center py-6 text-sm text-muted-foreground">
          Could not load users. <Button variant="link" onClick={handleRefresh} className="p-0 h-auto">Try again</Button>
        </div>
      </div>
    );
  }

  // Show empty state if no suggestions
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold flex items-center gap-1.5 text-sm">
            <Users size={16} />
            <span>People you may know</span>
          </h3>
          <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-7 w-7">
            <RefreshCw size={14} />
          </Button>
        </div>
        <div className="text-center py-6 text-sm text-muted-foreground">
          No suggestions available. <Button variant="link" onClick={handleRefresh} className="p-0 h-auto">Try refreshing</Button> or check back later.
        </div>
      </div>
    );
  }

  // Render the suggestions list
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold flex items-center gap-1.5 text-sm">
          <Users size={16} />
          <span>People you may know ({suggestions.length})</span>
        </h3>
        <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-7 w-7">
          <RefreshCw size={14} />
        </Button>
      </div>
      <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1 scrollbar-thin">
        {suggestions?.slice(0, 10).map((user: SuggestedUser) => (
          <div key={user._id} className="flex items-center justify-between py-2.5 px-2 hover:bg-muted/30 rounded-md transition-colors">
            <Link to={`/profile/${user.username}`} className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 border">
                <AvatarImage 
                  src={formatImageUrl(user.profileImage || '')} 
                  alt={user.username} 
                  onError={(e) => {
                    console.log(`Error loading avatar for ${user.username}`);
                    e.currentTarget.src = 'https://via.placeholder.com/100x100?text=User';
                  }}
                />
                <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div>
                <p className="text-sm font-medium line-clamp-1">{user.username}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{user.fullName}</p>
              </div>
            </Link>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:bg-primary/5 text-xs flex items-center gap-1 ml-1 p-1 h-7"
              onClick={() => handleFollow(user._id, user.username, user.isPrivate)}
            >
              <UserPlus size={12} />
              <span>Follow</span>
            </Button>
          </div>
        ))}
      </div>
      {suggestions && suggestions.length > 10 && (
        <div className="mt-4 pt-2 border-t">
          <Link to="/explore" className="text-xs text-primary hover:underline flex items-center justify-center">
            See all users
          </Link>
        </div>
      )}
    </div>
  );
};

export default SuggestedUsers;
