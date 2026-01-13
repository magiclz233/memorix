export function FrontBackground() {
  return (
    <div
      className='pointer-events-none absolute inset-0 overflow-hidden'
      aria-hidden
    >
      <div className='absolute inset-0 bg-zinc-50 dark:bg-black' />
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_65%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_65%)]' />
      <div className='absolute -left-28 top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.18),transparent_70%)] blur-3xl opacity-60 dark:opacity-0' />
      <div className='absolute right-[-6rem] top-16 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_70%)] blur-3xl opacity-55 dark:opacity-0' />
      <div className='absolute left-1/2 top-1/3 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.16),transparent_70%)] blur-3xl opacity-0 dark:opacity-60 dark:animate-pulse' />
      <div className='absolute right-[-10rem] bottom-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,116,144,0.4),transparent_70%)] blur-3xl opacity-0 dark:opacity-65 dark:animate-pulse' />
    </div>
  );
}
