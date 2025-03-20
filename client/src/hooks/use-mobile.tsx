
import React from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    window.innerWidth < 768
  );

  React.useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return isMobile;
}

// MobileOnly component for conditional rendering
export const MobileOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return <>{children}</>;
};

// DesktopOnly component for conditional rendering
export const DesktopOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  
  if (isMobile) return null;
  
  return <>{children}</>;
};
