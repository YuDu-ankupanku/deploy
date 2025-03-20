import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { postAPI, formatImageUrl } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ExplorePage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['explore'],
    queryFn: async () => {
      try {
        const response = await postAPI.getExplore();
        const posts = response.data?.posts || [];
        // Filter out posts from private accounts
        const publicPosts = posts.filter(post => post.user && !post.user.isPrivate);
        // Format image URL for each post:
        const formattedPosts = publicPosts.map(post => ({
          ...post,
          imageUrl: Array.isArray(post.media) && post.media.length > 0 
                      ? formatImageUrl(post.media[0])
                      : post.image 
                        ? formatImageUrl(post.image) 
                        : ''
        }));
        return formattedPosts;
      } catch (error) {
        console.error('Error fetching explore posts:', error);
        return [];
      }
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Explore</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-4 auto-rows-auto">
          {Array(12)
            .fill(0)
            .map((_, index) => (
              <Skeleton 
                key={index} 
                className={cn(
                  "rounded-sm",
                  (index === 0 || index === 4 || index === 8) ? "md:col-span-2 md:row-span-2" : ""
                )}
                style={{ 
                  aspectRatio: (index === 0 || index === 4 || index === 8) 
                    ? '1/1' 
                    : Math.random() > 0.5 ? '1/1' : '1/1.2' 
                }}
              />
            ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Explore</h1>
        <div className="text-center py-10">
          <p className="text-muted-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Explore</h1>
        <div className="text-center py-10">
          <p className="text-muted-foreground">No posts to explore</p>
          <p className="text-sm text-muted-foreground mt-2">Check back later for more content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Explore</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-4 auto-rows-auto">
        {data.map((post, index) => (
          <ExploreTile 
            key={post._id} 
            photo={{
              id: post._id,
              imageUrl: post.imageUrl,
              likes: post.likes.length
            }} 
            featured={index === 0 || index === 4 || index === 8} 
          />
        ))}
      </div>
    </div>
  );
};

interface ExploreTileProps {
  photo: {
    id: string;
    imageUrl: string;
    likes: number;
  };
  featured?: boolean;
}

const ExploreTile: React.FC<ExploreTileProps> = ({ photo, featured = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted rounded-sm animate-fade-in",
        "group cursor-pointer transition-transform hover:opacity-95",
        featured ? "md:col-span-2 md:row-span-2" : ""
      )}
      style={{ 
        aspectRatio: featured 
          ? '1/1' 
          : Math.random() > 0.5 ? '1/1' : '1/1.2' 
      }}
    >
      <img 
        src={photo.imageUrl} 
        alt="" 
        className={cn(
          "object-cover w-full h-full transition-all duration-500",
          isLoaded ? "blur-0" : "blur-sm"
        )}
        onLoad={() => setIsLoaded(true)}
      />
      
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="text-white font-medium">
          {photo.likes.toLocaleString()} likes
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
