
import React from 'react';
import ReelsList from '@/components/reels/ReelsList';

const ReelsPage = () => {
  return (
    <div className="h-full overflow-hidden">
      <ReelsList />
      
      {/* Bottom navigation for mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden">
        {/* Navigation will be rendered by the MainLayout */}
      </div>
    </div>
  );
};

export default ReelsPage;
