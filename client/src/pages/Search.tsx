import React, { useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { userAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { formatImageUrl } from '@/services/api';
import { useFollow } from '@/hooks/useFollow';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface SearchResult {
  _id: string;
  username: string;
  fullName: string;
  profileImage?: string;
  isFollowing?: boolean;
  isVerified?: boolean;
  isPrivate?: boolean;
}

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const { followUser, unfollowUser } = useFollow();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      try {
        if (query.trim()) {
          // Call the search endpoint if a query is provided.
          const response = await userAPI.searchUsers(query);
          console.log('Search results:', response.data);
          // The search endpoint returns an array directly.
          const data = response.data;
          return Array.isArray(data) ? data : (data.users || []);
        } else {
          // Otherwise, fetch all users.
          const response = await userAPI.getAllUsers();
          console.log('Fetched users for search page:', response.data);
          const data = response.data;
          return Array.isArray(data) ? data : (data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const clearSearch = () => {
    setQuery('');
  };

  const handleFollowToggle = async (user: SearchResult) => {
    try {
      if (user.isFollowing) {
        await unfollowUser(user._id, user.username);
        toast.success(`Unfollowed ${user.username}`);
      } else {
        await followUser(user._id, user.username, user.isPrivate || false);
        toast.success(
          user.isPrivate
            ? `Follow request sent to ${user.username}`
            : `Following ${user.username}`
        );
      }
      refetch();
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Action failed. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in px-4">
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <SearchIcon size={18} className="text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder="Search users"
          value={query}
          onChange={handleSearch}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            className="absolute inset-y-0 right-3 flex items-center"
            onClick={clearSearch}
          >
            <X size={18} className="text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {query ? 'Search Results' : 'All Users'}
        </h2>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {users && users.length > 0 ? (
              users.map((user: SearchResult) => (
                <div key={user._id} className="flex items-center justify-between">
                  <Link to={`/profile/${user.username}`} className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={formatImageUrl(user.profileImage || '')}
                        alt={user.username}
                        onError={(e) => {
                          e.currentTarget.src =
                            'https://via.placeholder.com/100x100?text=User';
                        }}
                      />
                      <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-medium">{user.username}</p>
                        {user.isVerified && (
                          <span className="text-blue-500 text-xs">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.fullName}</p>
                    </div>
                  </Link>
                  <Button
                    variant={user.isFollowing ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleFollowToggle(user)}
                  >
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No users found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
