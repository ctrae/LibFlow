'use client';

import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { BrandLogo } from '@/components/BrandLogo';

export function Lander() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timeline = gsap.timeline({
      onComplete: () => setIsVisible(false),
    });
    timeline
      .fromTo('.lander-word', { yPercent: 110 }, { yPercent: 0, duration: 0.55, stagger: 0.12, ease: 'power3.out' })
      .to('.lander-copy', { opacity: 0, duration: 0.35, delay: 0.55 })
      .to('.lander-panel', { yPercent: -100, duration: 0.75, ease: 'power3.inOut' });

    return () => {
      timeline.kill();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="lander-panel fixed inset-0 z-[100] flex items-center justify-center bg-[#3d281f] text-[#fffaf2]">
      <div className="lander-copy px-6 text-center">
        <div className="mb-8 flex flex-col items-center gap-3 text-[#e2bcae]"><BrandLogo size={160} className="rounded-2xl" /><span className="font-mono text-xs uppercase tracking-[0.3em]">FST Library</span></div>
        <div className="overflow-hidden"><p className="lander-word font-display text-5xl font-bold md:text-7xl">Keep</p></div>
        <div className="overflow-hidden"><p className="lander-word font-display text-5xl font-bold md:text-7xl">Track</p></div>
        <div className="overflow-hidden"><p className="lander-word font-display text-5xl font-bold md:text-7xl text-[#df806c]">Always</p></div>
      </div>
    </div>
  );
}
