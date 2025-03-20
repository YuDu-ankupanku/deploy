
import React, { useEffect, useState, useRef } from 'react';
import Post from '@/components/feed/Post';
import Stories from '@/components/feed/Stories';
import { usePosts } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

const HomePage = () => {
  const { posts, isLoading, toggleLike, toggleSave, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } = usePosts();
  const isMobile = useIsMobile();
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  useEffect(() => {
    if (!initialLoadDone) {
      refetch();
      setInitialLoadDone(true);
    }
  }, [initialLoadDone, refetch]);

  useEffect(() => {
    if (initialLoadDone && (!posts || posts.length === 0) && !isLoading) {
      const timer = setTimeout(() => {
        refetch();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [initialLoadDone, posts, isLoading, refetch]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      refetch();
    }, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [refetch]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [hasNextPage, isFetchingNextPage]);

  const validPosts = Array.isArray(posts) ? posts : [];
  
  console.log('Total posts to render:', validPosts.length);

  return (
    <div 
      ref={scrollContainerRef}
      className="w-full mx-auto overflow-y-auto pb-20 max-h-[calc(100vh-56px)] md:max-h-[calc(100vh-24px)] hide-scrollbar"
    >
      <div className="space-y-6 mb-4">
        <Stories />
        
        {isLoading ? (
          Array(3).fill(0).map((_, index) => (
            <div key={index} className="border rounded-md p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-[300px] w-full rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))
        ) : validPosts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No posts to display</p>
            <p className="text-sm text-muted-foreground mt-2">Follow more users to see their posts or create your own post</p>
          </div>
        ) : (
          <>
            {validPosts.map((post) => {
              const mediaUrl = post.media && post.media.length > 0 
                ? post.media[0] 
                : (post.image || '');
                
              console.log(`Rendering post ${post._id} with media:`, mediaUrl);
                
              return (
                <Post 
                  key={post._id}
                  id={post._id}
                  username={post.user?.username || 'Unknown'}
                  avatarUrl={post.user?.profileImage || ''}
                  imageUrl={mediaUrl} 
                  caption={post.caption || ''}
                  likesCount={post.likes?.length || 0}
                  commentsCount={post.comments?.length || 0}
                  timestamp={new Date(post.createdAt).toLocaleDateString()}
                  isLiked={!!post.isLiked}
                  isSaved={!!post.isSaved}
                  userId={post.user?._id || ''}
                  onLike={() => toggleLike(post._id, !!post.isLiked)}
                  onSave={() => toggleSave(post._id, !!post.isSaved)}
                  location={post.location}
                />
              );
            })}
            
            {isFetchingNextPage && (
              <div className="py-4 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            )}
            
            {!hasNextPage && validPosts.length > 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">
                You've reached the end
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
