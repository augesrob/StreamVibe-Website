import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { 
  Download, 
  Trash2, 
  File, 
  Search, 
  Loader2, 
  Calendar, 
  HardDrive,
  User
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FileDownloadSection = forwardRef((props, ref) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // Fetch files and join with profile to get username
      const { data, error } = await supabase
        .from('downloads')
        .select(`
          *,
          profiles:uploaded_by (username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load files.",
      });
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: fetchFiles
  }));

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user]);

  const handleDownload = async (file) => {
    try {
      setDownloadingId(file.id);
      
      const { data, error } = await supabase.storage
        .from('downloads')
        .download(file.file_path);

      if (error) throw error;

      // Create blob link and download
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url); 

      toast({
        title: "Download Started",
        description: `Downloading ${file.filename}...`,
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Could not download file.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file) => {
    setDeletingId(file.id);
    try {
      // 1. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('downloads')
        .remove([file.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue to delete from DB even if storage fails (orphan cleanup)
        // or throw? Usually better to try both but warn.
        // For now, we treat it as an error but try DB delete if it was just "not found"
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from('downloads')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "Deleted",
        description: "File deleted successfully.",
      });

      // Update local state
      setFiles(prev => prev.filter(f => f.id !== file.id));

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete file. You might not have permission.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Available Downloads</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input 
            placeholder="Search files..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#12121a] border-gray-800 focus:border-cyan-500 transition-all text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 bg-[#12121a] rounded-xl border border-gray-800 border-dashed">
          <div className="bg-gray-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
             <File className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-300">No files found</h3>
          <p className="text-gray-500">There are no files available for download at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const isOwner = user && file.uploaded_by === user.id;
            const canDelete = isAdmin || isOwner;

            return (
              <Card key={file.id} className="bg-[#12121a] border-gray-800 hover:border-gray-700 transition-all duration-300 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gray-800/50 rounded-lg group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors text-gray-400">
                      <File className="w-6 h-6" />
                    </div>
                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-400 -mr-2">
                            {deletingId === file.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete File?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                              Are you sure you want to delete "{file.filename}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(file)} className="bg-red-600 hover:bg-red-700">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-100 truncate mb-1" title={file.filename}>
                      {file.filename}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2 min-h-[40px]">
                      {file.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1 bg-gray-900 px-2 py-1 rounded">
                      <HardDrive className="w-3 h-3" />
                      {formatBytes(file.file_size)}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-900 px-2 py-1 rounded">
                      <Calendar className="w-3 h-3" />
                      {new Date(file.created_at).toLocaleDateString()}
                    </div>
                    {file.profiles?.username && (
                      <div className="flex items-center gap-1 bg-gray-900 px-2 py-1 rounded">
                        <User className="w-3 h-3" />
                        {file.profiles.username}
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleDownload(file)} 
                    disabled={downloadingId === file.id}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {downloadingId === file.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
});

FileDownloadSection.displayName = "FileDownloadSection";

export default FileDownloadSection;