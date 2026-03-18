import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, ShieldCheck, CreditCard, Wrench } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const [avatarUrl, setAvatarUrl]  = useState(null);
  const [username, setUsername]    = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url);
    if (user.user_metadata?.username)   setUsername(user.user_metadata.username);
    supabase.from('profiles').select('avatar_url, username').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.username)   setUsername(data.username);
      });
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

          {/* Logo — no status widget */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <Logo className="h-8 w-auto" />
          </Link>

          {/* Desktop Nav — NO Tools link */}
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
          </nav>

          {/* Desktop user menu */}
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

                <DropdownMenuContent className="w-56 bg-slate-900 border-slate-700 text-white" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{username || 'User'}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer text-slate-200 hover:text-white focus:bg-slate-800">
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/tools/auction" className="cursor-pointer text-cyan-400 font-semibold focus:bg-slate-800">
                      <Wrench className="mr-2 h-4 w-4" /> Live Auction Tool
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/billing" className="cursor-pointer text-slate-200 hover:text-white focus:bg-slate-800">
                      <CreditCard className="mr-2 h-4 w-4" /> Billing & Plans
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer text-cyan-400 font-semibold focus:bg-slate-800">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-400 focus:bg-slate-800">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
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
                <Link to="/dashboard" className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                <Link to="/billing" className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>Billing</Link>
                {isAdmin && (
                  <Link to="/admin" className="text-cyan-400 hover:text-cyan-300 block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>Admin Panel</Link>
                )}
                <button onClick={() => { signOut(); setIsMenuOpen(false); }} className="text-red-400 hover:text-red-300 block w-full text-left px-3 py-2 rounded-md text-base font-medium">
                  Log out
                </button>
              </>
            )}
            {!user && (
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 block px-3 py-2 rounded-md font-bold" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
