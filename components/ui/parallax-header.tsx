'use client';
import { motion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface ParallaxHeaderProps {
  src?: string | null;
  children?: React.ReactNode;
  className?: string;
  overlayFrom?: string; // e.g. "from-zinc-50"
}

export function ParallaxHeader({ 
  src, 
  children,
  className,
  overlayFrom = "from-zinc-50 dark:from-zinc-950"
}: ParallaxHeaderProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className={cn("relative h-[70vh] w-full overflow-hidden", className)}>
      <motion.div style={{ y }} className="absolute inset-0">
         {src ? (
            <Image
              src={src}
              fill
              className="object-cover"
              alt="Cover"
              priority
              unoptimized
            />
         ) : (
            <div className="h-full w-full bg-zinc-900">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-zinc-900/50 to-black" />
            </div>
         )}
         <div className="absolute inset-0 bg-black/20" />
      </motion.div>
      
      <div className={cn("absolute inset-0 bg-gradient-to-t via-transparent to-transparent", overlayFrom)} />
      
      <motion.div style={{ opacity }} className="absolute inset-0 pointer-events-none">
         <div className="h-full w-full pointer-events-auto">
            {children}
         </div>
      </motion.div>
    </section>
  )
}
