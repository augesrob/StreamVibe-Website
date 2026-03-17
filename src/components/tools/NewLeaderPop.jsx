import React, { useEffect, useState } from 'react';

export default function NewLeaderPop({ name }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3800);
    return () => clearTimeout(t);
  }, [name]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 left-1/2 z-50 pointer-events-none"
      style={{ transform: 'translateX(-50%)' }}>
      <div className="animate-in zoom-in-50 fade-in duration-300
        bg-gradient-to-r from-yellow-400 to-orange-500
        text-black font-black font-mono tracking-widest
        px-8 py-4 rounded-2xl shadow-2xl shadow-yellow-500/40
        flex flex-col items-center gap-1 text-center">
        <div className="text-xl">👑 NEW LEADER!</div>
        <div className="text-sm font-bold opacity-80">{name}</div>
      </div>
    </div>
  );
}
