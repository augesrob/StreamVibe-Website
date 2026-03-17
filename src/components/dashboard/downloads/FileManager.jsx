import React, { useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import FileUploadSection from './FileUploadSection';
import FileDownloadSection from './FileDownloadSection';

const FileManager = () => {
  const { user } = useAuth();
  const downloadListRef = useRef(null);

  const handleUploadSuccess = () => {
    // Refresh the list when a new file is uploaded
    if (downloadListRef.current) {
      downloadListRef.current.refresh();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
         <h2 className="text-2xl font-bold text-white">Resource Center</h2>
         <p className="text-gray-400">Download tools, assets, and resources for your streaming journey.</p>
      </div>

      {/* Show upload section for all authenticated users to allow sharing */}
      {user && (
        <div className="space-y-6">
          <FileUploadSection onUploadSuccess={handleUploadSuccess} />
          <div className="h-px bg-gray-800 w-full" />
        </div>
      )}
      
      <FileDownloadSection ref={downloadListRef} />
    </div>
  );
};

export default FileManager;