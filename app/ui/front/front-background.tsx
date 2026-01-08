export function FrontBackground() {
  return (
    <div
      className='pointer-events-none absolute inset-0 overflow-hidden'
      aria-hidden
    >
      <div className='absolute -left-24 top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.35),transparent_70%)] blur-3xl opacity-70 dark:opacity-80 front-float' />
      <div className='absolute right-[-6rem] top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.35),transparent_70%)] blur-3xl opacity-60 dark:opacity-70 front-float-slow' />
      <div className='absolute bottom-[-12rem] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(14,116,144,0.35),transparent_70%)] blur-3xl opacity-50 dark:opacity-60 front-float' />
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.25)_1px,transparent_0)] [background-size:24px_24px] opacity-30 dark:opacity-20' />
      <div className='absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent' />
    </div>
  );
}
