import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userAPI, formatImageUrl, postAPI } from '@/services/api';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Grid, Bookmark, Heart } from 'lucide-react';

interface ProfileData {
  user: {
    _id: string;
    username: string;
    fullName: string;
    bio: string;
    website: string;
    profileImage: string;
    isVerified: boolean;
    isPrivate: boolean;
    followers: Array<any>;
    following: Array<any>;
  };
  posts: Array<any>;
  isFollowing: boolean;
  isFollowedBy: boolean;
  hasFollowRequest: boolean;
}

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('posts');
  
  useEffect(() => {
    if (!username && user) {
      navigate(`/profile/${user.username}`);
    }
  }, [username, user, navigate]);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      try {
        const response = await userAPI.getUser(username);
        
        const formattedData = {
          ...response.data,
          user: {
            ...response.data.user,
            profileImage: formatImageUrl(response.data.user.profileImage)
          },
          posts: response.data.posts.map(post => ({
            ...post,
            user: {
              ...post.user,
              profileImage: formatImageUrl(post.user.profileImage)
            },
            media: Array.isArray(post.media) 
              ? post.media.map(m => formatImageUrl(m))
              : post.image ? [formatImageUrl(post.image)] : []
          }))
        };
        
        console.log('Formatted profile posts:', formattedData.posts);
        return formattedData;
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
        throw error;
      }
    },
    enabled: !!username
  });
  
  const isCurrentUserProfile = user?._id === data?.user?._id;
  
  const { data: savedPostsData, isLoading: isSavedLoading } = useQuery({
    queryKey: ['saved-posts'],
    queryFn: async () => {
      try {
        const response = await userAPI.getSavedPosts();
        console.log('Saved posts response:', response.data);
        
        const uniquePosts = new Map();
        response.data.posts.forEach(post => {
          uniquePosts.set(post._id, {
            ...post,
            user: {
              ...post.user,
              profileImage: formatImageUrl(post.user.profileImage)
            },
            media: Array.isArray(post.media) 
              ? post.media.map(m => formatImageUrl(m))
              : post.image ? [formatImageUrl(post.image)] : []
          });
        });
        
        return Array.from(uniquePosts.values());
      } catch (error) {
        console.error('Error fetching saved posts:', error);
        toast.error('Failed to load saved posts');
        return [];
      }
    },
    enabled: isCurrentUserProfile && activeTab === 'saved'
  });
  
  const { data: likedPostsData, isLoading: isLikedLoading } = useQuery({
    queryKey: ['liked-posts'],
    queryFn: async () => {
      try {
        const response = await userAPI.getLikedPosts();
        console.log('Liked posts response:', response.data);
        
        const uniquePosts = new Map();
        response.data.posts.forEach(post => {
          uniquePosts.set(post._id, {
            ...post,
            user: {
              ...post.user,
              profileImage: formatImageUrl(post.user.profileImage)
            },
            media: Array.isArray(post.media) 
              ? post.media.map(m => formatImageUrl(m))
              : post.image ? [formatImageUrl(post.image)] : []
          });
        });
        
        return Array.from(uniquePosts.values());
      } catch (error) {
        console.error('Error fetching liked posts:', error);
        toast.error('Failed to load liked posts');
        return [];
      }
    },
    enabled: isCurrentUserProfile && activeTab === 'liked'
  });
  
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
          <Skeleton className="h-24 w-24 md:h-36 md:w-36 rounded-full" />
          
          <div className="space-y-4 flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Skeleton className="h-8 w-36" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
            
            <div className="flex justify-center md:justify-start space-x-6">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
            
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {Array(9).fill(0).map((_, index) => (
              <Skeleton key={index} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center">
        <p className="text-destructive">Failed to load profile</p>
        <button 
          className="text-primary hover:underline mt-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['profile', username] })}
        >
          Try again
        </button>
      </div>
    );
  }
  
  const { user: profileUser, posts, isFollowing, hasFollowRequest } = data as ProfileData;
  
  const profileData = {
    username: profileUser.username,
    fullName: profileUser.fullName,
    avatarUrl: profileUser.profileImage,
    bio: profileUser.bio || '',
    postsCount: posts.length,
    followersCount: profileUser.followers.length,
    followingCount: profileUser.following.length,
    isCurrentUser: isCurrentUserProfile,
    userId: profileUser._id,
    isPrivate: profileUser.isPrivate,
    isFollowing,
    hasFollowRequest
  };

  const uniquePostsMap = new Map();
  posts.forEach(post => {
    uniquePostsMap.set(post._id, {
      id: post._id,
      imageUrl: post.media?.[0] || formatImageUrl(post.image) || ''
    });
  });
  
  const regularPosts = Array.from(uniquePostsMap.values());
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'saved' && isCurrentUserProfile) {
      queryClient.prefetchQuery({
        queryKey: ['saved-posts'],
        queryFn: () => userAPI.getSavedPosts()
      });
    } else if (value === 'liked' && isCurrentUserProfile) {
      queryClient.prefetchQuery({
        queryKey: ['liked-posts'],
        queryFn: () => userAPI.getLikedPosts()
      });
    }
  };
  
  const getPhotoData = () => {
    if (activeTab === 'saved') {
      if (!isCurrentUserProfile) return [];
      return savedPostsData?.map(post => ({
        id: post._id,
        imageUrl: post.media?.[0] || formatImageUrl(post.image) || ''
      })) || [];
    } else if (activeTab === 'liked') {
      if (!isCurrentUserProfile) return [];
      return likedPostsData?.map(post => ({
        id: post._id,
        imageUrl: post.media?.[0] || formatImageUrl(post.image) || ''
      })) || [];
    } else {
      return regularPosts;
    }
  };
  
  const isTabLoading = () => {
    if (activeTab === 'saved') return isSavedLoading;
    if (activeTab === 'liked') return isLikedLoading;
    return false;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <ProfileHeader {...profileData} />
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <Grid size={16} />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger 
            value="saved" 
            className="flex items-center gap-2"
            disabled={!isCurrentUserProfile}
          >
            <Bookmark size={16} />
            <span className="hidden sm:inline">Saved</span>
          </TabsTrigger>
          <TabsTrigger 
            value="liked" 
            className="flex items-center gap-2"
            disabled={!isCurrentUserProfile}
          >
            <Heart size={16} />
            <span className="hidden sm:inline">Liked</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="mt-6">
          {profileData.isPrivate && !isCurrentUserProfile && !isFollowing ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Follow to see posts</p>
            </div>
          ) : (
            <PhotoGrid photos={getPhotoData()} isLoading={isTabLoading()} />
          )}
        </TabsContent>
        <TabsContent value="saved" className="mt-6">
          {!isCurrentUserProfile ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">This content is private</p>
            </div>
          ) : (
            <PhotoGrid photos={getPhotoData()} isLoading={isTabLoading()} />
          )}
        </TabsContent>
        <TabsContent value="liked" className="mt-6">
          {!isCurrentUserProfile ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">This content is private</p>
            </div>
          ) : (
            <PhotoGrid photos={getPhotoData()} isLoading={isTabLoading()} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface PhotoGridProps {
  photos: Array<{ id: string; imageUrl: string }>;
  isLoading?: boolean;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, isLoading = false }) => {
  console.log('Rendering PhotoGrid with photos:', photos);
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {Array(9).fill(0).map((_, index) => (
          <Skeleton key={index} className="aspect-square" />
        ))}
      </div>
    );
  }
  
  if (photos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No posts to display</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-3 gap-1 md:gap-4">
      {photos.map((photo) => (
        <div 
          key={photo.id} 
          className={cn(
            "relative overflow-hidden bg-muted rounded-sm animate-fade-in",
            "hover:opacity-90 transition-opacity cursor-pointer"
          )}
        >
          <AspectRatio ratio={1}>
            <img 
              src={photo.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image'} 
              alt="" 
              className="object-cover w-full h-full"
              onError={(e) => {
                // Prevent infinite loop if fallback image fails
                if (!e.currentTarget.dataset.fallback) {
                  e.currentTarget.dataset.fallback = 'true';
                  e.currentTarget.src = 'https://via.placeholder.com/400x400?text=Image+Error';
                }
              }}
            />
          </AspectRatio>
        </div>
      ))}
    </div>
  );
};

export default ProfilePage;
