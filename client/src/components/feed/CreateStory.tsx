
import React, { useState, useRef } from 'react';
import { Plus, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { storyAPI } from '@/services/api';
import { toast } from 'sonner';

const CreateStory = ({ onStoryCreated }: { onStoryCreated?: () => void }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should not exceed 10MB');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select an image for your story');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      // Use 'media' field name to match backend expectation
      formData.append('media', selectedFile);
      if (caption) {
        formData.append('caption', caption);
      }

      // Log FormData contents for debugging
      console.log('Story FormData:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof File ? value.name : value}`);
      }

      const response = await storyAPI.createStory(formData);
      console.log('Story created successfully:', response);
      toast.success('Story created successfully!');
      
      // Reset form
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      setOpen(false);
      
      // Callback to refresh stories
      if (onStoryCreated) {
        onStoryCreated();
      }
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Failed to create story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative min-w-16 flex-shrink-0 cursor-pointer">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
            <Plus size={24} className="text-gray-500" />
          </div>
          <div className="mt-1 text-xs text-center text-gray-500">New</div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new story</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-9 w-9">
              <AvatarImage 
                src={user?.profileImage ? 
                  (user.profileImage.startsWith('http') 
                    ? user.profileImage 
                    : `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${user.profileImage}`)
                  : undefined
                } 
                alt={user?.username} 
              />
              <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{user?.username}</span>
          </div>
          
          {preview ? (
            <div className="relative">
              <img 
                src={preview} 
                alt="Story preview" 
                className="w-full h-64 object-cover rounded-md" 
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleResetFile}
              >
                <X size={16} />
              </Button>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                <p className="text-sm font-medium">
                  Click to upload
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
          
          <Textarea
            placeholder="Add a caption... (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="resize-none"
            maxLength={2200}
          />
          
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Story'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStory;
