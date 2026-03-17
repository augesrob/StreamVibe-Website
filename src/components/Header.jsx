import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, ShieldCheck, CreditCard, Wrench } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import SupabaseStatus from '@/components/SupabaseStatus';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const [avatarUrl, setAvatarUrl]  = useState(null);
  const [username, setUsername]    = useState(null);

  React.useEffect(() => {
    if (user) {
      if (user.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url);
      if (user.user_metadata?.username)   setUsername(user.user_metadata.username);
      const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('avatar_url, username').eq('id', user.id).single();
        if (data) {
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
          if (data.username)   setUsername(data.username);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const navLinks = [
    { name: 'Home',     path: '/' },
    { name: 'Features', path: '/#features' },
    { name: 'Pricing',  path: '/billing' },
  ];

  return (
    <header className="fixed w-full top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-4">
            <Logo className="h-8 w-auto" />
            <SupabaseStatus />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map(link => (
              <React.Fragment key={link.name}>
                {link.path.startsWith('/#') ? (
                  <a href={link.path} className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                    {link.name}
                  </a>
                ) : (
                  <Link to={link.path} className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                    {link.name}
                  </Link>
                )}
              </React.Fragment>
            ))}
            {/* Tools link — only shown when logged in */}
            {user && (
              <Link to="/tools/auction"
                className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-semibold flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" /> Tools
              </Link>
            )}
          </nav>

          {/* User Menu / CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-slate-800 hover:ring-cyan-500 transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>{username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{username || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" /><span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/tools/auction" className="cursor-pointer text-cyan-400 font-semibold focus:text-cyan-500">
                      <Wrench className="mr-2 h-4 w-4" /><span>Live Auction Tool</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/billing" className="cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4" /><span>Billing & Plans</span>
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer text-cyan-400 font-semibold focus:text-cyan-500">
                        <ShieldCheck className="mr-2 h-4 w-4" /><span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" /><span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 border-0 text-white shadow-lg shadow-blue-500/20">
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-300 hover:text-white p-2">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map(link => (
              <React.Fragment key={link.name}>
                {link.path.startsWith('/#') ? (
                  <a href={link.path} className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>{link.name}</a>
                ) : (
                  <Link to={link.path} className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>{link.name}</Link>
                )}
              </React.Fragment>
            ))}
            {user && (
              <>
                <Link to="/tools/auction" className="text-cyan-400 hover:text-cyan-300 block px-3 py-2 rounded-md text-base font-semibold" onClick={() => setIsMenuOpen(false)}>
                  🛠 Tools
                </Link>
                <Link to="/dashboard" className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                {isAdmin && (
                  <Link to="/admin" className="text-cyan-400 hover:text-cyan-300 block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>Admin Panel</Link>
                )}
                <button onClick={() => { signOut(); setIsMenuOpen(false); }} className="text-red-400 hover:text-red-300 block w-full text-left px-3 py-2 rounded-md text-base font-medium">
                  Log out
                </button>
              </>
            )}
            {!user && (
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 block px-3 py-2 rounded-md text-base font-medium font-bold" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
