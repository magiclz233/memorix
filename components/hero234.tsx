'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

import { Button } from '@/components/ui/button';

type HeroImage = {
  src: string;
  alt?: string;
};

type Hero234Props = {
  galleryImages?: HeroImage[];
  ctaHref?: string;
  ctaLabel?: string;
};

const fallbackImages: HeroImage[] = [
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw1.jpeg',
    alt: 'Gallery image 1',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw2.jpeg',
    alt: 'Gallery image 2',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw3.jpeg',
    alt: 'Gallery image 3',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw4.jpeg',
    alt: 'Gallery image 4',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw5.jpeg',
    alt: 'Gallery image 5',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw6.jpeg',
    alt: 'Gallery image 6',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw7.jpeg',
    alt: 'Gallery image 7',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw8.jpeg',
    alt: 'Gallery image 8',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw9.jpeg',
    alt: 'Gallery image 9',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw10.jpeg',
    alt: 'Gallery image 10',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw11.jpeg',
    alt: 'Gallery image 11',
  },
  {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/bw12.jpeg',
    alt: 'Gallery image 12',
  },
];

const buildRows = (items: HeroImage[]) => {
  const rows: HeroImage[][] = [[], []];
  items.forEach((item, index) => {
    rows[index % 2].push(item);
  });
  return rows;
};

const resolveRows = (images?: HeroImage[]) => {
  const list = images && images.length > 0 ? images : fallbackImages;
  let rows = buildRows(list);
  if (!rows[0].length || !rows[1].length) {
    const fill = rows[0].length ? rows[0] : rows[1];
    rows = [fill, fill];
  }
  return rows;
};

const Hero234 = ({
  galleryImages,
  ctaHref = '/gallery',
  ctaLabel = 'View Projects',
}: Hero234Props) => {
  const rows = resolveRows(galleryImages);

  return (
    <section className='bg-background relative min-h-screen overflow-hidden'>
      <div className='absolute inset-0 flex flex-col justify-center gap-4'>
        {rows.map((row, rowIndex) => (
          <motion.div
            key={rowIndex}
            className='flex gap-4 will-change-transform'
            animate={{
              x: rowIndex === 1 ? [-1920, 0] : [0, -1920],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {[...row, ...row, ...row].map((image, imageIndex) => (
              <motion.div
                key={`${rowIndex}-${imageIndex}`}
                className='relative flex-shrink-0 overflow-hidden rounded-lg'
                style={{
                  width: rowIndex === 1 ? '280px' : '240px',
                  height: rowIndex === 1 ? '350px' : '300px',
                }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={image.src}
                  alt={image.alt ?? `Gallery image ${imageIndex + 1}`}
                  className='h-full w-full object-cover'
                />
              </motion.div>
            ))}
          </motion.div>
        ))}
      </div>

      <div className='from-background absolute left-0 top-0 z-10 h-full w-[160px] bg-gradient-to-r to-transparent md:w-[200px]' />
      <div className='from-background absolute right-0 top-0 z-10 h-full w-[160px] bg-gradient-to-l to-transparent md:w-[200px]' />

      <div className='relative z-20 flex min-h-screen items-center justify-center'>
        <motion.div
          className='rounded-lg bg-black/60 p-8 backdrop-blur-md md:p-12'
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <motion.h1
            className='text-3xl leading-tight text-white md:text-5xl lg:text-6xl'
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            A Studio <br />
            Crafting <br />
            Digital Art
          </motion.h1>

          <motion.div
            className='mt-6'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <Button size='lg' variant='secondary' asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export { Hero234 };
