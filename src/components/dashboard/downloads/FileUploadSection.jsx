import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

const FileUploadSection = ({ onUploadSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [description, setDescription] = useState('');
  const inputRef = useRef(null);

  const MAX_SIZE = 1024 * 1024 * 1024; // 1GB limit

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (selectedFile) => {
    if (selectedFile.size > MAX_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 1GB.",
      });
      return false;
    }
    return true;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  }, [toast]);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setDescription('');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const uploadFile = async () => {
    if (!file || !user) return;

    setUploading(true);
    setProgress(0);

    try {
      // 1. Upload to Storage
      // Use timestamp + random string + clean filename to avoid collisions but keep readability
      const fileExt = file.name.split('.').pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}_${safeName}`;
      const filePath = fileName;

      // Simulate progress since Supabase client basic upload doesn't stream progress events easily
      // in this simplified context without TUS or XHR wrapping
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);

      const { data: storageData, error: storageError } = await supabase.storage
        .from('downloads')
        .upload(filePath, file, {
           cacheControl: '3600',
           upsert: false
        });

      clearInterval(progressInterval);

      if (storageError) {
          console.error("Storage upload failed:", storageError);
          throw storageError;
      }

      setProgress(100);

      // 2. Insert into Database
      const { error: dbError } = await supabase
        .from('downloads')
        .insert({
          filename: file.name,
          file_size: file.size,
          uploaded_by: user.id,
          file_path: filePath,
          description: description || null
        });

      if (dbError) {
        console.error("Database insert failed:", dbError);
        // Attempt cleanup
        await supabase.storage.from('downloads').remove([filePath]);
        throw dbError;
      }

      toast({
        title: "Success",
        description: "File uploaded successfully.",
      });

      clearFile();
      if (onUploadSuccess) onUploadSuccess();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Could not upload file.",
      });
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-[#12121a] border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <UploadCloud className="w-5 h-5 text-cyan-400" />
          Upload New File
        </CardTitle>
        <CardDescription>
          Share resources with the community. Max size 1GB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {!file ? (
          <div 
            className={`
              relative flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl transition-colors cursor-pointer
              ${dragActive ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-600 bg-gray-900/50"}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Input 
              ref={inputRef}
              type="file" 
              className="hidden"
              onChange={handleChange}
            />
            <div className="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
              <div className="p-4 rounded-full bg-gray-800">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500">Supported formats: All</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/20 rounded-lg text-cyan-400">
                  <File className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-white truncate max-w-[200px] sm:max-w-[300px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              {!uploading && (
                <Button variant="ghost" size="icon" onClick={clearFile} className="hover:bg-red-950/30 hover:text-red-400">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <Input 
                placeholder="Add a file description (optional)" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
                className="bg-black/20 border-gray-700 text-white"
              />
              
              {uploading ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ) : (
                <Button onClick={uploadFile} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                   Upload File
                </Button>
              )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default FileUploadSection;