import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AlertTriangle } from 'lucide-react';

// Pages
import Home                from '@/pages/Home';
import Terms               from '@/pages/Terms';
import Privacy             from '@/pages/Privacy';
import AuthCallback        from '@/pages/AuthCallback';
import Dashboard           from '@/pages/Dashboard';
import Billing             from '@/pages/Billing';
import AdminPanel          from '@/pages/AdminPanel';
import DebugUser           from '@/pages/DebugUser';
import LoginPage           from '@/pages/LoginPage';
import SignupPage          from '@/pages/SignupPage';
import EmailVerificationPage from '@/pages/EmailVerificationPage';
import PaymentSuccess      from '@/pages/PaymentSuccess';
import PaymentCancel       from '@/pages/PaymentCancel';
import TikTokLinkingPage   from '@/pages/TikTokLinkingPage';
import ApiDocumentation    from '@/components/admin/ApiDocumentation';

// Tools
import AuctionTool     from '@/pages/tools/AuctionTool';
import AuctionOverlay  from '@/pages/tools/AuctionOverlay';
import OverlaySetup    from '@/pages/tools/OverlaySetup';

// ── Games ──
import LiveWordsTool      from '@/pages/tools/LiveWordsTool';
import LiveWordsOverlay   from '@/pages/tools/LiveWordsOverlay';

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"                    element={<Home />} />
      <Route path="/terms"               element={<Terms />} />
      <Route path="/privacy"             element={<Privacy />} />
      <Route path="/auth/callback"       element={<AuthCallback />} />

      {/* Auth */}
      <Route path="/login"               element={<LoginPage />} />
      <Route path="/signup"              element={<SignupPage />} />
      <Route path="/email-verification"  element={<EmailVerificationPage />} />

      {/* Payment */}
      <Route path="/payment-success"     element={<PaymentSuccess />} />
      <Route path="/payment-cancel"      element={<PaymentCancel />} />

      {/* TikTok Linking */}
      <Route path="/tiktok-linking" element={
        <ProtectedRoute><TikTokLinkingPage /></ProtectedRoute>
      } />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/billing"   element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/admin"     element={<ProtectedRoute requireAdmin={true}><AdminPanel /></ProtectedRoute>} />
      <Route path="/api-docs"  element={
        <ProtectedRoute>
          <div className="pt-24 px-4 bg-[#0a0a0f] min-h-screen">
            <ApiDocumentation />
          </div>
        </ProtectedRoute>
      } />
      <Route path="/admin-debug" element={<ProtectedRoute><DebugUser /></ProtectedRoute>} />

      {/* ── StreamVibe Tools ── */}
      <Route path="/tools/auction"       element={<ProtectedRoute><AuctionTool /></ProtectedRoute>} />
      <Route path="/tools/overlay-setup" element={<ProtectedRoute><OverlaySetup /></ProtectedRoute>} />
      <Route path="/overlay"             element={<AuctionOverlay />} />

      {/* ── StreamVibe Games ── */}
      <Route path="/tools/games/live-words"  element={<ProtectedRoute><LiveWordsTool /></ProtectedRoute>} />
      {/* Overlays are public — browser source URLs used in TikTok Live Studio */}
      <Route path="/games-overlay/live-words" element={<LiveWordsOverlay />} />
    </Routes>
  );
}

function App() {
  const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const missingEnv = !supabaseUrl || !supabaseAnonKey;

  return (
    <AuthProvider>
      <Router>
        <Helmet>
          <title>StreamVibe - Elevate Your TikTok LIVE Streams</title>
        </Helmet>
        <ScrollToTop />
        {missingEnv && (
          <div className="fixed top-0 left-0 w-full z-[100] p-2 bg-red-600 text-white
            font-bold text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            CRITICAL: Supabase Configuration Missing. App will not function correctly.
          </div>
        )}
        <div className="min-h-screen bg-slate-950 flex flex-col">
          <Header />
          <main className="flex-grow">
            <AppRoutes />
          </main>
          <Footer />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
