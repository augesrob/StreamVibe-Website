import React from 'react';
import { Github, Twitter, Youtube, Mail } from 'lucide-react';
import Logo from '@/components/Logo';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-1">
            <div className="mb-6">
              <Logo />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Professional streaming tools for TikTok LIVE creators.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-bold text-white mb-6">Product</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#features" className="text-slate-400 hover:text-cyan-400 transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-slate-400 hover:text-cyan-400 transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-bold text-white mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">About Us</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Blog</a></li>
              <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Careers</a></li>
            </ul>
          </div>
          
          {/* Connect Column */}
          <div>
            <h4 className="font-bold text-white mb-6">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-cyan-400 hover:bg-cyan-900/30 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-cyan-400 hover:bg-cyan-900/30 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-cyan-400 hover:bg-cyan-900/30 transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-cyan-400 hover:bg-cyan-900/30 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">© 2026 StreamVibe. All rights reserved.</p>
          <div className="flex gap-8 text-sm">
            <Link to="/privacy" className="text-slate-500 hover:text-cyan-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-slate-500 hover:text-cyan-400 transition-colors">Terms of Service</Link>
             <Link to="#" className="text-slate-500 hover:text-cyan-400 transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;