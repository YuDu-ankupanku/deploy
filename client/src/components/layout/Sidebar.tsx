
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Compass, 
  MessageCircle, 
  Heart, 
  PlusSquare, 
  User, 
  Film, 
  LogOut,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const [isAvatarError, setIsAvatarError] = useState(false);

  // Format image URL to ensure it works properly
  const formatImageUrl = (url: string) => {
    if (!url) return null;
    
    // If it's already a fully qualified URL
    if (url.startsWith('http')) return url;
    
    // For server-hosted images, append API base URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = apiBaseUrl.replace('/api', '');
    
    // Handle both uploads/file.jpg and uploads\file.jpg formats
    const normalizedUrl = url.replace(/\\/g, '/');
    
    return `${baseUrl}/${normalizedUrl.startsWith('/') ? normalizedUrl.substring(1) : normalizedUrl}`;
  };
  
  const handleAvatarError = () => {
    setIsAvatarError(true);
    console.error('Failed to load sidebar avatar');
  };
  
  // Default placeholder for avatar
  const placeholderAvatar = 'https://via.placeholder.com/40?text=User';
  
  const profileImageUrl = user?.profileImage ? formatImageUrl(user.profileImage) : placeholderAvatar;

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] border-r bg-card z-10">
      <div className="flex flex-col h-full p-4">
        <div className="py-6">
          <h1 className="text-2xl font-bold text-center">Photogram</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          <NavItem to="/" icon={<Home size={20} />} label="Home" />
          <NavItem to="/explore" icon={<Compass size={20} />} label="Explore" />
          <NavItem to="/search" icon={<Search size={20} />} label="Search" />
          <NavItem to="/reels" icon={<Film size={20} />} label="Reels" />
          <NavItem to="/messages" icon={<MessageCircle size={20} />} label="Messages" />
          <NavItem to="/notifications" icon={<Heart size={20} />} label="Notifications" />
          <NavItem to="/create" icon={<PlusSquare size={20} />} label="Create" />
          <NavItem to="/profile" icon={<User size={20} />} label="Profile" />
          <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
        </nav>
        
        <Separator className="my-4" />
        
        <div className="mt-auto">
          {user && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <Avatar className="h-8 w-8 rounded-full overflow-hidden bg-muted">
                <AvatarImage 
                  src={isAvatarError ? placeholderAvatar : profileImageUrl}
                  alt={user.username}
                  onError={handleAvatarError}
                />
                <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="truncate">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.fullName}</p>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            className="w-full justify-start space-x-2"
            onClick={logout}
          >
            <LogOut size={20} />
            <span>Log out</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem = ({ to, icon, label }: NavItemProps) => {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent transition-all",
        isActive ? "bg-accent font-medium" : "text-muted-foreground"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
};

export default Sidebar;
