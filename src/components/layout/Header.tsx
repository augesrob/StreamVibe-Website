"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LogOut, LayoutDashboard, ShieldCheck, CreditCard } from 'lucide-react'
import Logo from './Logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, isAdmin, signOut } = useAuth()

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'Pricing', href: '/#pricing' },
  ]

  return (
    <header className="fixed w-full top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/"><Logo /></Link>
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-slate-800 hover:ring-cyan-500 transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback>{user.email?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-900 border-slate-700 text-white" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.user_metadata?.username || 'User'}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer text-slate-200 hover:text-white focus:text-white focus:bg-slate-800">
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/billing" className="cursor-pointer text-slate-200 hover:text-white focus:text-white focus:bg-slate-800">
                      <CreditCard className="mr-2 h-4 w-4" /> Billing
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer text-cyan-400 font-semibold focus:text-cyan-300 focus:bg-slate-800">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-slate-800">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 border-0 text-white shadow-lg shadow-blue-500/20">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
          <button className="md:hidden text-slate-300 hover:text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setMenuOpen(false)}>
                {link.name}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/dashboard" className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link href="/billing" className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setMenuOpen(false)}>Billing</Link>
                {isAdmin && (
                  <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 block px-3 py-2 rounded-md text-base font-medium" onClick={() => setMenuOpen(false)}>Admin Panel</Link>
                )}
                <button onClick={() => { signOut(); setMenuOpen(false) }} className="text-red-400 hover:text-red-300 block w-full text-left px-3 py-2 rounded-md text-base font-medium">Log out</button>
              </>
            ) : (
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 block px-3 py-2 rounded-md font-bold" onClick={() => setMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
