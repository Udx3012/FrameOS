import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function PremiumBackground() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Silky smooth springs for buttery performance without jitter
  const springX = useSpring(x, { stiffness: 40, damping: 25 });
  const springY = useSpring(y, { stiffness: 40, damping: 25 });

  useEffect(() => {
    let ticking = false;
    const handleMouseMove = (event: MouseEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { clientX, clientY } = event;
          const { innerWidth, innerHeight } = window;
          const nx = (clientX - innerWidth / 2) / (innerWidth / 2);
          const ny = (clientY - innerHeight / 2) / (innerHeight / 2);
          x.set(nx * -3);
          y.set(ny * -3);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#F8F8F6] overflow-hidden transform-gpu">
      {/* 1. Layout Grid Layer with radial mask fade-out and blue animated lines */}
      <motion.div
        style={{
          x: springX,
          y: springY,
          maskImage: "radial-gradient(circle at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 30%, transparent 80%)",
          willChange: "transform",
        }}
        className="absolute inset-[-10px] animate-blue-grid transform-gpu"
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="layout-grid-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="80" y2="0" stroke="#2563EB" strokeWidth="1" strokeOpacity="0.75" />
              <line x1="0" y1="0" x2="0" y2="80" stroke="#2563EB" strokeWidth="1" strokeOpacity="0.75" />
              <circle cx="0" cy="0" r="2" fill="#2563EB" fillOpacity="0.9" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#layout-grid-pattern)" />
        </svg>
      </motion.div>

      {/* 2. Background Marquee Text (6% opacity, rotated 2deg, slow scroll) */}
      <div className="absolute inset-0 flex flex-col justify-around rotate-[2deg] scale-110 opacity-[0.06] select-none pointer-events-none z-[-2] overflow-hidden py-16 transform-gpu">
        <div className="animate-marquee whitespace-nowrap font-display font-extrabold text-[12vh] tracking-[0.02em] uppercase leading-none text-[#111111] will-change-transform">
          <span>EDIT • COMPRESS • EXPORT • GIF • CONVERT • SUBTITLE • TRIM • CREATE • SHARE •&nbsp;</span>
          <span>EDIT • COMPRESS • EXPORT • GIF • CONVERT • SUBTITLE • TRIM • CREATE • SHARE •&nbsp;</span>
        </div>
        <div className="animate-marquee whitespace-nowrap font-display font-extrabold text-[12vh] tracking-[0.02em] uppercase leading-none text-[#111111] will-change-transform" style={{ animationDirection: "reverse", animationDuration: "120s" }}>
          <span>CREATE • SHARE • EDIT • COMPRESS • EXPORT • GIF • CONVERT • SUBTITLE • TRIM •&nbsp;</span>
          <span>CREATE • SHARE • EDIT • COMPRESS • EXPORT • GIF • CONVERT • SUBTITLE • TRIM •&nbsp;</span>
        </div>
      </div>

      {/* 3. Subtle Paper Grain Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.025] transform-gpu"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
