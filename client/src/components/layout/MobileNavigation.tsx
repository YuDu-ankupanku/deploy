
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Search, Film, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const MobileNavigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-10 md:hidden">
      <div className="flex justify-around items-center h-16">
        <MobileNavItem to="/" icon={<Home size={24} />} label="Home" />
        <MobileNavItem to="/explore" icon={<Compass size={24} />} label="Explore" />
        <MobileNavItem to="/search" icon={<Search size={24} />} label="Search" />
        <MobileNavItem to="/reels" icon={<Film size={24} />} label="Reels" />
        <MobileNavItem to="/profile" icon={<User size={24} />} label="Profile" />
      </div>
    </nav>
  );
};

interface MobileNavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const MobileNavItem = ({ to, icon, label }: MobileNavItemProps) => {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "flex flex-col items-center justify-center w-full h-full",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-xs mt-1">{label}</span>
    </NavLink>
  );
};

export default MobileNavigation;
