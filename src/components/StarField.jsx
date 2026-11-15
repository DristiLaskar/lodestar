import { useEffect, useRef } from 'react';

// Quiet twinkling backdrop. It is deliberately dim: the star map is the
// feature, the sky behind it is just weather.
export default function StarField() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let stars = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const count = Math.round((window.innerWidth * window.innerHeight) / 14000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.1 + 0.3) * dpr,
        p: Math.random() * 6.28,
        s: Math.random() * 0.018 + 0.004,
      }));
    };

    const draw = () => {
      const light = document.documentElement.dataset.theme === 'light';
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.p += s.s;
        const a = (0.3 + Math.sin(s.p) * 0.3) * (light ? 0.22 : 0.9);
        ctx.fillStyle = light ? `rgba(11,18,64,${a})` : `rgba(214,224,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
