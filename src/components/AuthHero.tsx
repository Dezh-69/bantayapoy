import React, { useState, useEffect } from 'react';

export const AuthHero = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div
      className={`relative flex flex-col overflow-hidden ${
        isDesktop
          ? 'w-full lg:w-7/12 justify-between p-12'
          : 'w-full h-[220px] justify-center p-8'
      }`}
      style={{ background: '#4D2120' }}
    >
      {/* Background image at 40% opacity */}
      <div className="absolute inset-0 opacity-40">
        <img
          src="/login_bg.png"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content (above the bg image) */}
      <div className="relative z-10 flex flex-col gap-6">
        {/* Logo row */}
        <div className="flex items-center gap-3">
          {/* Fire icon */}
          <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C12 0 4 8 4 16C4 20.4183 7.58172 24 12 24C16.4183 24 20 20.4183 20 16C20 8 12 0 12 0Z" fill="#D32F2F"/>
            <path d="M12 12C12 12 8 16 8 20C8 22.2091 9.79086 24 12 24C14.2091 24 16 22.2091 16 20C16 16 12 12 12 12Z" fill="#FF8A65"/>
          </svg>
          <span className="text-white font-black text-2xl tracking-[-0.05em] uppercase">
            AgapSense
          </span>
        </div>

        {/* Hero headline */}
        <div className="max-w-[448px]">
          <h1 className="font-black text-[48px] leading-[60px] tracking-[-0.025em] text-white">
            Smarter detection,
            <br />
            <span className="text-[#D32F2F]">faster response.</span>
          </h1>
        </div>
      </div>

      {/* Spacer for bottom (justify-between pushes content up) */}
      <div></div>
    </div>
  );
};
