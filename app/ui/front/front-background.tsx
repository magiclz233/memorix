export function FrontBackground() {
  return (
    <div
      className='pointer-events-none absolute inset-0 overflow-hidden'
      aria-hidden
    >
      <div className='absolute inset-0 bg-zinc-50 dark:bg-black' />
      <div className='absolute inset-0 bg-[radial-gradient(#00000011_1px,transparent_1px)] [background-size:24px_24px] opacity-70 dark:bg-[radial-gradient(#ffffff15_1px,transparent_1px)] dark:opacity-40' />
      <div className='absolute -left-24 top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22),transparent_70%)] blur-3xl opacity-60 dark:opacity-0' />
      <div className='absolute right-[-6rem] top-16 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.2),transparent_70%)] blur-3xl opacity-55 dark:opacity-0' />
      <div className='absolute left-1/2 top-1/4 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.55),transparent_70%)] blur-3xl opacity-0 dark:opacity-80 dark:animate-pulse' />
      <div className='absolute right-[-10rem] bottom-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.55),transparent_70%)] blur-3xl opacity-0 dark:opacity-75 dark:animate-pulse' />
    </div>
  );
}
