// Post.tsx
import React, { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePosts } from '@/hooks/usePosts';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

interface PostProps {
  id: string;
  username: string;
  avatarUrl: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  location?: string;
  isLiked: boolean;
  isSaved: boolean;
  userId: string;
  onLike: () => void;
  onSave: () => void;
}

const Post: React.FC<PostProps> = ({
  id,
  username,
  avatarUrl,
  imageUrl,
  caption,
  likesCount,
  commentsCount,
  timestamp,
  location,
  isLiked,
  isSaved,
  userId,
  onLike,
  onSave
}) => {
  const { user } = useAuth();
  const { deletePost } = usePosts();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isAvatarError, setIsAvatarError] = useState(false);
  const [isPostImageError, setIsPostImageError] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isOwner = user?._id === userId;
  
  const placeholderImage = 'https://via.placeholder.com/400x400?text=Image+Not+Available';
  
  const formatImageUrl = (url: string) => {
    if (!url) return placeholderImage;
    
    if (url.startsWith('http')) return url;
    
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = apiBaseUrl.replace('/api', '');
    
    const normalizedUrl = url.replace(/\\/g, '/');
    
    return `${baseUrl}/${normalizedUrl.startsWith('/') ? normalizedUrl.substring(1) : normalizedUrl}`;
  };
  
  const handleDoubleClick = () => {
    if (!isLiked) {
      onLike();
    }
  };
  
  const shouldTruncate = caption.length > 125;
  const displayCaption = shouldTruncate && !showFullCaption
    ? `${caption.substring(0, 125)}...`
    : caption;

  const handleImageError = () => {
    setIsPostImageError(true);
    setIsImageLoaded(true);
    console.error(`Failed to load post image: ${imageUrl}`);
  };

  const handleAvatarError = () => {
    setIsAvatarError(true);
    console.error(`Failed to load avatar: ${avatarUrl}`);
  };

  const handleImageLoaded = () => {
    setIsImageLoaded(true);
  };

  const handleOpenDeleteDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const handleConfirmDelete = async () => {
    // Close the dialog and mark post as deleting immediately
    setShowDeleteDialog(false);
    setIsDeleting(true);
    
    try {
      await deletePost(id);
      // Optionally, show a success toast here if not already done in the hook
    } catch (error) {
      setIsDeleting(false);
      // Error handling is performed in the hook's onError; additional UI handling can go here if needed.
    }
  };

  const handleDownloadImage = () => {
    const formattedImageUrl = formatImageUrl(imageUrl);
    
    const anchor = document.createElement('a');
    anchor.href = formattedImageUrl;
    anchor.download = `post-${id}.jpg`;
    
    fetch(formattedImageUrl)
      .then(response => response.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        anchor.href = objectUrl;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
        toast.success("Image downloaded successfully");
      })
      .catch(error => {
        console.error("Error downloading image:", error);
        toast.error("Failed to download image");
      });
  };

  const formattedImageUrl = formatImageUrl(imageUrl);
  const formattedAvatarUrl = formatImageUrl(avatarUrl);
  
  // If post is being deleted, return null to prevent UI issues
  if (isDeleting) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl overflow-hidden border shadow-sm mb-6 animate-fade-in">
      {/* Post header */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${username}`} className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={isAvatarError ? placeholderImage : formattedAvatarUrl} 
              alt={username} 
              onError={handleAvatarError}
            />
            <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{username}</p>
            {location && (
              <p className="text-xs text-muted-foreground">{location}</p>
            )}
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadImage}>
              <Download className="mr-2 h-4 w-4" />
              <span>Download Image</span>
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem 
                onClick={handleOpenDeleteDialog} 
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Post</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Are you sure you want to delete this post?"
        description="This action cannot be undone. This will permanently delete your post."
      />
      
      {/* Post image */}
      <div className="relative w-full">
        <img
          src={isPostImageError ? placeholderImage : formattedImageUrl}
          alt="Post"
          className={cn(
            "w-full h-auto transition-all duration-500",
            isImageLoaded ? "blur-0" : "blur-sm"
          )}
          onLoad={handleImageLoaded}
          onError={handleImageError}
          onDoubleClick={handleDoubleClick}
        />
        {!isImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {/* Post actions and content */}
      <div className="p-4">
        <div className="flex justify-between mb-2">
          <div className="flex space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onLike}
              className={isLiked ? "text-red-500" : ""}
            >
              <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
            </Button>
            <Link to={`/p/${id}/comments`}>
              <Button variant="ghost" size="icon">
                <MessageCircle size={24} />
              </Button>
            </Link>
            <Button variant="ghost" size="icon">
              <Share2 size={24} />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onSave}
          >
            <Bookmark size={24} fill={isSaved ? "currentColor" : "none"} />
          </Button>
        </div>
        
        <p className="font-medium text-sm mb-1">
          {likesCount} {likesCount === 1 ? 'like' : 'likes'}
        </p>
        
        {caption && (
          <div className="mb-2">
            <span className="font-medium text-sm mr-1">{username}</span>
            <span className="text-sm">{displayCaption}</span>
            {shouldTruncate && (
              <button 
                className="text-muted-foreground text-sm ml-1"
                onClick={() => setShowFullCaption(!showFullCaption)}
              >
                {showFullCaption ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}
        
        <Link 
          to={`/p/${id}/comments`}
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          View all {commentsCount} comments
        </Link>
        
      </div>
    </div>
  );
};

export default Post;
