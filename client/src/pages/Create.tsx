import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, MapPin, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { postAPI } from '@/services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const CreatePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'select' | 'edit'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    console.log('Selected file:', selectedFile);
    
    // Check file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Check file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }
    
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setStep('edit');
    };
    reader.readAsDataURL(selectedFile);
  };

  const handlePost = async () => {
    if (!file || !image) {
      toast.error("Please select an image");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Creating post with file:', file.name);
      
      const formData = new FormData();
      formData.append('media', file); // Using 'media' to match backend
      if (caption) formData.append('caption', caption);
      if (location) formData.append('location', location);
      
      // Log FormData contents for debugging
      console.log('Form data being sent:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof File ? value.name : value}`);
      }
      
      const response = await postAPI.createPost(formData);
      console.log('Post created successfully:', response.data);
      
      // Invalidate the feed query to refresh posts
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      
      toast.success('Post created successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Error creating post:', error);
      // More detailed error handling
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create post';
      toast.error(`Failed to create post: ${errorMessage}`);
      console.log('Error details:', error.response?.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('select');
    setFile(null);
    setImage(null);
    setCaption('');
    setLocation('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">Create Post</h1>
        {step === 'edit' && (
          <Button variant="ghost" size="sm" onClick={resetForm}>
            <X size={18} className="mr-2" />
            Cancel
          </Button>
        )}
      </div>
      
      {step === 'select' ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg p-12 text-center">
          <Image size={64} className="text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Drag photos and videos here</h2>
          <p className="text-muted-foreground mb-6">Or click to select from your device</p>
          
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleImageSelect}
            />
            <Button>Select from computer</Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="bg-muted rounded-md overflow-hidden aspect-square">
            {image && (
              <img
                src={image}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          
          {/* Caption and details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage.startsWith('http') 
                      ? user.profileImage 
                      : `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${user.profileImage}`}
                    alt={user?.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/40?text=User';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="font-medium">{user?.username}</span>
            </div>
            
            <div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="min-h-[150px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {caption.length}/2,200
              </p>
            </div>
            
            <div className="flex items-center border-b pb-3">
              <MapPin size={18} className="text-muted-foreground mr-2" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                className="border-none bg-transparent p-0 h-auto focus-visible:ring-0"
              />
            </div>
            
            <Button 
              onClick={handlePost} 
              className="w-full" 
              disabled={!image || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : 'Share'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePage;
