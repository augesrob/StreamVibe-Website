import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const CallToAction = () => {
  return (
    <section className="py-24 bg-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Ready to elevate your stream?</h2>
        <p className="text-slate-400 max-w-2xl mx-auto mb-10 text-lg">
          Join thousands of creators who use StreamVibe to engage their audience and grow their channel.
        </p>
        <Button 
          asChild
          size="lg" 
          className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90 transition-opacity"
        >
          <Link to="/signup">
             Start Streaming Now
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default CallToAction;