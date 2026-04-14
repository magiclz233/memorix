'use client';

import {
  Aperture,
  Building2,
  Calendar,
  Camera,
  Download,
  FileText,
  Flag,
  Gauge,
  Grid,
  HardDrive,
  Heart,
  MapPin,
  Maximize,
  Palette,
  Ruler,
  Timer,
} from 'lucide-react';
import type { GalleryItem } from '@/app/lib/gallery';
import { Histogram } from '../histogram';

type PhotoInfoSidebarProps = {
  item: GalleryItem;
  isEditing: boolean;
  footTitle: string;
  locale: string;
  t: (key: string) => string;
};

const formatNumber = (val?: number | null, digits = 1) =>
  typeof val === 'number' && !Number.isNaN(val)
    ? val.toFixed(digits).replace(/\.0+$/, '')
    : null;

const formatExposure = (val?: number | null) => {
  if (typeof val !== 'number' || Number.isNaN(val)) return null;
  if (val >= 1) return `${formatNumber(val, 2)}s`;
  return `1/${Math.round(1 / val)}`;
};

const formatFileSize = (bytes?: number | null) => {
  if (typeof bytes !== 'number') return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (locale: string, date?: string | null) => {
  if (!date) return null;
  return new Date(date).toLocaleString(locale, { hour12: false });
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className='flex justify-between items-center text-[12px]'>
      <div className='flex items-center space-x-2 text-gray-400'>
        {icon}
        <span>{label}</span>
      </div>
      <span className='font-semibold text-gray-900 dark:text-gray-100'>
        {value || '-'}
      </span>
    </div>
  );
}

function SimpleRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className='flex justify-between text-[12px]'>
      <span className='text-gray-400'>{label}</span>
      <span className='font-semibold text-gray-900 dark:text-gray-100'>
        {value || '-'}
      </span>
    </div>
  );
}

export function PhotoInfoSidebar({
  item,
  isEditing,
  footTitle,
  locale,
  t,
}: PhotoInfoSidebarProps) {
  const resolution =
    item.width && item.height ? `${item.width} x ${item.height}` : '-';
  const mp =
    item.width && item.height
      ? (item.width * item.height) / 1000000
      : null;

  const focalLength = formatNumber(item.focalLength);
  const apertureValue = formatNumber(item.aperture);
  const exposureValue = formatExposure(item.exposure);
  const isoValue = typeof item.iso === 'number' ? String(item.iso) : null;

  const getExposureProgram = (prog: number | null) => {
    if (prog === null) return null;
    return t(`values.exposureProgram.${prog}`);
  };

  const getFlashState = (flash: number | null) => {
    if (flash === null) return null;
    const fired = (flash & 1) !== 0;
    return fired ? t('values.flash.fired') : t('values.flash.off');
  };

  const exposureProgramValue =
    typeof item.exposureProgram === 'number'
      ? getExposureProgram(item.exposureProgram)
      : null;
  const flashValue =
    typeof item.flash === 'number' ? getFlashState(item.flash) : null;
  const hasShootingInfo =
    Boolean(item.whiteBalance) ||
    Boolean(exposureProgramValue) ||
    Boolean(flashValue);

  const locationParts = item.locationName
    ? item.locationName.split(',').map((s) => s.trim())
    : [];
  const city = locationParts[0];
  const country =
    locationParts.length > 1
      ? locationParts[locationParts.length - 1]
      : null;

  return (
    <aside className='w-[420px] flex-shrink-0 bg-white dark:bg-zinc-950/90 border-l border-gray-100 dark:border-zinc-800 flex flex-col h-full overflow-y-auto custom-scrollbar'>
      <div className='p-6 space-y-8'>
        <section className='flex justify-between items-start'>
          <h2 className='text-lg font-bold tracking-tight text-primary dark:text-white leading-tight pr-4 break-words'>
            {isEditing ? footTitle || item.title : item.title}
          </h2>
          <div className='flex items-center space-x-3 mt-1 flex-shrink-0'>
            <button
              className='w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors'
              title='Like'
            >
              <Heart className='w-5 h-5' />
            </button>
            <a
              href={`/api/media/stream/${item.id}?download=true`}
              download
              className='w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary dark:hover:text-white transition-colors'
              title='Download'
            >
              <Download className='w-5 h-5' />
            </a>
          </div>
        </section>

        {(item.gpsLatitude || item.locationName) && (
          <section>
            <div className='relative h-40 w-full bg-zinc-50 dark:bg-zinc-900/60 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 mb-2'>
              <div className='w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/70 text-zinc-400'>
                <MapPin className='w-10 h-10 opacity-20' />
              </div>
              {item.gpsLatitude && item.gpsLongitude && (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='relative'>
                    <div className='w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg' />
                    <div className='absolute -inset-2 bg-red-500/30 rounded-full animate-ping' />
                  </div>
                </div>
              )}
            </div>
            <div className='flex items-center space-x-2 text-[11px] text-gray-500 dark:text-gray-400'>
              <MapPin className='w-3.5 h-3.5' />
              <span>
                {item.locationName ||
                  `${formatNumber(item.gpsLatitude, 4)}, ${formatNumber(item.gpsLongitude, 4)}`}
              </span>
            </div>
          </section>
        )}

        <section>
          <h3 className='text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-3'>
            {t('details.camera')}
          </h3>
          <div className='grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden'>
            <div className='bg-white dark:bg-zinc-900/70 p-4 flex flex-col'>
              <div className='flex items-center space-x-2 text-zinc-400 mb-1'>
                <Ruler className='w-4 h-4' />
                <span className='text-[10px] uppercase font-bold tracking-wider'>
                  {t('details.focalLength')}
                </span>
              </div>
              <p className='text-[16px] font-bold'>
                {focalLength ? `${focalLength} mm` : '-'}
              </p>
            </div>
            <div className='bg-white dark:bg-zinc-900/70 p-4 flex flex-col'>
              <div className='flex items-center space-x-2 text-gray-400 mb-1'>
                <Aperture className='w-4 h-4' />
                <span className='text-[10px] uppercase font-bold tracking-wider'>
                  {t('details.aperture')}
                </span>
              </div>
              <p className='text-[16px] font-bold'>
                {apertureValue ? `f/${apertureValue}` : '-'}
              </p>
            </div>
            <div className='bg-white dark:bg-zinc-900/70 p-4 flex flex-col'>
              <div className='flex items-center space-x-2 text-gray-400 mb-1'>
                <Timer className='w-4 h-4' />
                <span className='text-[10px] uppercase font-bold tracking-wider'>
                  {t('details.shutter')}
                </span>
              </div>
              <p className='text-[16px] font-bold'>{exposureValue ?? '-'}</p>
            </div>
            <div className='bg-white dark:bg-zinc-900/70 p-4 flex flex-col'>
              <div className='flex items-center space-x-2 text-gray-400 mb-1'>
                <Gauge className='w-4 h-4' />
                <span className='text-[10px] uppercase font-bold tracking-wider'>
                  {t('details.iso')}
                </span>
              </div>
              <p className='text-[16px] font-bold'>{isoValue ?? '-'}</p>
            </div>
          </div>
        </section>

        <section>
          <div className='flex justify-between items-center mb-3'>
            <h3 className='text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400'>
              {t('sections.histogram')}
            </h3>
            <div className='flex space-x-1'>
              <div className='w-1.5 h-1.5 rounded-full bg-red-400/80' />
              <div className='w-1.5 h-1.5 rounded-full bg-green-400/80' />
              <div className='w-1.5 h-1.5 rounded-full bg-blue-400/80' />
            </div>
          </div>
          <div className='h-24 w-full bg-zinc-50/50 dark:bg-zinc-900/50 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 p-2'>
            <Histogram src={item.src} className='w-full h-full' />
          </div>
        </section>

        <section className='space-y-4'>
          <h3 className='text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2'>
            {t('sections.equipment')}
          </h3>
          <div className='grid grid-cols-1 gap-4'>
            <div className='flex items-start space-x-3'>
              <Camera className='w-5 h-5 text-gray-400' />
              <div className='flex-grow'>
                <p className='text-[10px] text-gray-400 uppercase font-bold'>
                  {t('details.camera')}
                </p>
                <p className='text-[13px] font-bold text-gray-800 dark:text-gray-100'>
                  {item.maker} {item.camera}
                </p>
              </div>
            </div>
            <div className='flex items-start space-x-3'>
              <Aperture className='w-5 h-5 text-gray-400' />
              <div className='flex-grow'>
                <p className='text-[10px] text-gray-400 uppercase font-bold'>
                  {t('details.lens')}
                </p>
                <p className='text-[13px] font-bold text-gray-800 dark:text-gray-100'>
                  {item.lens || '-'}
                </p>
              </div>
            </div>
            <div className='flex items-start space-x-3'>
              <Maximize className='w-5 h-5 text-gray-400' />
              <div className='flex-grow flex justify-between items-end'>
                <p className='text-[13px] text-gray-500'>
                  {t('details.focalLength35mm')}
                </p>
                <p className='text-[13px] font-bold'>
                  {item.focalLengthIn35mmFormat
                    ? `${item.focalLengthIn35mmFormat} mm`
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className='space-y-3'>
          <h3 className='text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2'>
            {t('sections.basic')}
          </h3>
          <div className='space-y-2.5'>
            <InfoRow
              icon={<FileText className='w-4 h-4' />}
              label={t('details.filename')}
              value={item.title}
            />
            <InfoRow
              icon={<HardDrive className='w-4 h-4' />}
              label={t('details.fileSize')}
              value={formatFileSize(item.size)}
            />
            <InfoRow
              icon={<Maximize className='w-4 h-4' />}
              label={t('details.resolution')}
              value={resolution}
            />
            <InfoRow
              icon={<Grid className='w-4 h-4' />}
              label={t('details.megapixels')}
              value={mp ? `${mp.toFixed(2)} MP` : null}
            />
            <InfoRow
              icon={<Calendar className='w-4 h-4' />}
              label={t('details.dateShot')}
              value={formatDate(locale, item.dateShot)}
            />
            <InfoRow
              icon={<Palette className='w-4 h-4' />}
              label={t('details.colorSpace')}
              value={item.colorSpace || 'sRGB'}
            />
            {city && (
              <InfoRow
                icon={<Building2 className='w-4 h-4' />}
                label={t('details.city')}
                value={city}
              />
            )}
            {country && (
              <InfoRow
                icon={<Flag className='w-4 h-4' />}
                label={t('details.country')}
                value={country}
              />
            )}
          </div>
        </section>

        {hasShootingInfo && (
          <section className='space-y-3'>
            <h3 className='text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2'>
              {t('sections.shooting')}
            </h3>
            <div className='space-y-2.5'>
              {item.whiteBalance && (
                <SimpleRow
                  label={t('details.whiteBalance')}
                  value={item.whiteBalance}
                />
              )}
              {exposureProgramValue && (
                <SimpleRow
                  label={t('details.exposureProgram')}
                  value={exposureProgramValue}
                />
              )}
              {flashValue && (
                <SimpleRow label={t('details.flash')} value={flashValue} />
              )}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}