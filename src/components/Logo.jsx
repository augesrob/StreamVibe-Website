import React from 'react';
import { motion } from 'framer-motion';

const Logo = () => {
  return (
    <div className="flex items-center gap-3 group cursor-pointer select-none">
      <div className="w-10 h-10 flex items-center justify-center relative">
        <svg
          viewBox="0 0 50 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
        >
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          <motion.path
            d="M5 20 L 15 20 L 20 5 L 25 35 L 30 15 L 35 25 L 45 20"
            fill="none"
            stroke="url(#logo-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1, 0],
              opacity: [0, 1, 1, 0],
              strokeDasharray: ["0 1", "1 0", "1 0", "0 1"]
            }}
            transition={{
              duration: 3,
              ease: "easeInOut",
              repeat: Infinity,
              times: [0, 0.4, 0.6, 1]
            }}
          />
        </svg>
      </div>
      <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#22d3ee] to-[#c084fc] tracking-tight">
        streamvibe
      </span>
    </div>
  );
};

export default Logo;