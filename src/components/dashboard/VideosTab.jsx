import React from 'react';

// This component has been deprecated as video sync is no longer supported.
// It is preserved as a placeholder to prevent import errors but will render an informational message if used.

const VideosTab = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-2">Video Sync Unavailable</h3>
      <p className="max-w-md">
        Video syncing functionality has been disabled. You can still manage your profile and view other dashboard features.
      </p>
    </div>
  );
};

export default VideosTab;