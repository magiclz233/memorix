'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BackToTopProps = {
  label: string;
};

export function BackToTop({ label }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className='fixed bottom-6 right-6 z-40'
        >
          <Button
            type='button'
            size='icon'
            className='h-11 w-11 rounded-full bg-zinc-900/90 text-white shadow-lg shadow-zinc-900/20 backdrop-blur-md hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={label}
            title={label}
          >
            <ArrowUp className='h-4 w-4' />
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
