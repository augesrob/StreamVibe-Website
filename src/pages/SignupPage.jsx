import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const validatePassword = (pwd) => {
      if (pwd.length < 8) return "Password must be at least 8 characters long";
      if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
      if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
      if (!/[!@#$%^&*]/.test(pwd)) return "Password must contain at least one special character (!@#$%^&*)";
      return null;
  };

  const validateUsername = (name) => {
      if (name.length < 3) return "Username must be at least 3 characters";
      if (name.length > 20) return "Username must be max 20 characters";
      if (!/^[a-zA-Z0-9_]+$/.test(name)) return "Username can only contain letters, numbers, and underscores";
      return null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setValidationError("Image size must be less than 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setValidationError('');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
        setValidationError("Passwords do not match");
        return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
        setValidationError(pwdError);
        return;
    }

    const userError = validateUsername(username);
    if (userError) {
        setValidationError(userError);
        return;
    }

    setIsLoading(true);

    try {
        // 1. Sign up user
        const { data, error } = await signUpWithEmail(email, password, {
             username: username 
        });

        if (error) throw error;

        // 2. Upload Avatar if user exists and file is selected
        // Note: This relies on the user being logged in immediately or having permission
        // If email confirmation is ON, this part might fail until they verify. 
        // We will try, but not block the flow.
        if (data.user && avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${data.user.id}/avatar.${fileExt}`;
            const filePath = `${fileName}`;

            try {
               const { error: uploadError } = await supabase.storage
                  .from('profiles')
                  .upload(filePath, avatarFile, { upsert: true });

               if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage
                     .from('profiles')
                     .getPublicUrl(filePath);
                  
                  // Update profile with avatar URL
                  await supabase.from('profiles').update({
                      avatar_url: publicUrl,
                      username: username // Ensure username is set in table
                  }).eq('id', data.user.id);
               } else {
                   console.warn("Avatar upload failed (likely due to verification pending):", uploadError);
               }
            } catch (upErr) {
               console.error("Avatar upload exception:", upErr);
            }
        }

        // Success - redirect to email verification
        navigate('/email-verification', { state: { email } });

    } catch (err) {
        console.error("Signup error:", err);
        // Error toast is handled in signUpWithEmail
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] flex items-center justify-center">
      <Helmet>
        <title>Sign Up - StreamVibe</title>
      </Helmet>

      <Card className="w-full max-w-md bg-[#1a1a24] border-gray-800 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription className="text-gray-400">Join StreamVibe and elevate your streams</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {validationError && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-900 text-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                </Alert>
            )}

            <div className="flex flex-col items-center mb-4">
                <Label htmlFor="avatar" className="mb-2 cursor-pointer group relative">
                    <Avatar className="w-24 h-24 border-2 border-dashed border-gray-600 group-hover:border-cyan-500 transition-colors">
                        <AvatarImage src={avatarPreview} className="object-cover" />
                        <AvatarFallback className="bg-[#12121a]">
                            <ImageIcon className="w-8 h-8 text-gray-500" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                        <Upload className="w-6 h-6 text-white" />
                    </div>
                </Label>
                <input 
                    type="file" 
                    id="avatar" 
                    ref={fileInputRef}
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                />
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-transparent"
                >
                    Upload Profile Picture
                </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="StreamerName" 
                className="bg-[#12121a] border-gray-700 text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <p className="text-[10px] text-gray-500">3-20 chars, letters, numbers, underscores only.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                className="bg-[#12121a] border-gray-700 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                className="bg-[#12121a] border-gray-700 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                className="bg-[#12121a] border-gray-700 text-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupPage;