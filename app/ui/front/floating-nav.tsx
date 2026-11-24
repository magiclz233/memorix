'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LogIn, ShieldCheck, UserCircle, KeyRound, LogOut, Search, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ModeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocaleSwitcher } from '@/components/locale-switcher';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { ChangePasswordForm } from '@/app/ui/shared/change-password-form';
import { signOutAction } from '@/app/lib/actions';

const navItems = [
  { key: 'home', href: '/' },
  { key: 'gallery', href: '/gallery' },
  { key: 'timeline', href: '/timeline' },
  { key: 'collections', href: '/collections' },
  { key: 'about', href: '/about' },
];

export function FloatingNav({
  minPasswordLength,
  siteName = 'Memorix',
}: {
  minPasswordLength: number;
  siteName?: string;
}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const isCollectionDetail =
    pathname?.startsWith('/collections/') && pathname !== '/collections';
  const loginHref = pathname
    ? `/login?callbackUrl=${encodeURIComponent(pathname)}`
    : '/login';
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const accountCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { data: session, refetch: refetchSession } = authClient.useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const user = session?.user;
  const displayName = user?.name || user?.email || t('account.loggedIn');
  const email = user?.email ?? null;
  const avatarUrl = user?.image ?? null;
  const avatarFallback = displayName.trim().slice(0, 1);
  const isAdmin =
    (user as { role?: string } | null | undefined)?.role === 'admin';
  const accountPanelClass = cn(
    'w-64 p-4 shadow-xl backdrop-blur-md',
    isHome
      ? 'border-white/20 bg-black/70 text-white'
      : 'border-input bg-background/95 text-foreground'
  );
  
  const menuItemClass = cn(
    'flex w-full justify-start gap-3 px-3 py-2 text-sm font-medium transition-colors',
    isHome
      ? 'hover:bg-white/10 hover:text-white'
      : 'hover:bg-accent hover:text-accent-foreground'
  );

  const accountMutedTextClass = isHome ? 'text-white/60' : 'text-muted-foreground';
  const accountSubtleTextClass = isHome ? 'text-white/45' : 'text-muted-foreground/70';
  const accountBadgeClass = cn(
    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.25em]',
    isHome
      ? 'border-white/20 text-white/70'
      : 'border-input text-muted-foreground'
  );
  const loginButtonClass = cn(
    'h-9 w-full text-xs uppercase tracking-[0.2em]',
    isHome
      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white'
      : 'bg-primary text-primary-foreground hover:bg-primary/90'
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = searchKeyword.trim();
    setSearchOpen(false);
    router.push(keyword ? `/gallery?q=${encodeURIComponent(keyword)}` : '/gallery');
  };

  const clearAccountCloseTimer = () => {
    if (!accountCloseTimerRef.current) return;
    clearTimeout(accountCloseTimerRef.current);
    accountCloseTimerRef.current = null;
  };

  const handleAccountOpen = () => {
    clearAccountCloseTimer();
    setAccountOpen(true);
  };

  const handleAccountClose = () => {
    clearAccountCloseTimer();
    accountCloseTimerRef.current = setTimeout(() => {
      setAccountOpen(false);
    }, 120);
  };

  useEffect(() => {
    void refetchSession({ query: { disableCookieCache: true } });
  }, [pathname, refetchSession]);

  useEffect(() => {
    const handleFocus = () => {
      void refetchSession({ query: { disableCookieCache: true } });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void refetchSession({ query: { disableCookieCache: true } });
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchSession]);

  useEffect(() => {
    return () => {
      clearAccountCloseTimer();
    };
  }, []);

  if (isCollectionDetail) {
    return null;
  }

  const useDarkOverlayText = isHome && !scrolled;

  return (
    <div className='front-floating-nav fixed inset-x-0 top-0 z-50 pointer-events-none transition-all duration-200 ease-out'>
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3.5 transition-all duration-200 md:px-8',
          scrolled || !isHome
            ? 'pointer-events-auto border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/75'
            : 'pt-5',
        )}
      >
        <div className='pointer-events-auto flex items-center gap-2.5'>
          {/* 移动端主导航抽屉 */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className={cn(
                  'h-8 w-8 rounded-full border shadow-sm backdrop-blur-md lg:hidden',
                  useDarkOverlayText
                    ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                    : 'border-input bg-background/80 text-foreground hover:bg-accent',
                )}
                aria-label='Menu'
              >
                <Menu className='h-4 w-4' />
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='w-72'>
              <SheetHeader>
                <SheetTitle className='font-serif tracking-[0.25em] uppercase'>
                  {siteName}
                </SheetTitle>
              </SheetHeader>
              <nav className='mt-6 flex flex-col gap-1.5'>
                {navItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== '/' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
                      )}
                    >
                      {t(`items.${item.key}`)}
                    </Link>
                  );
                })}
                {isAdmin ? (
                  <Link
                    href='/dashboard'
                    onClick={() => setMobileMenuOpen(false)}
                    className='mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  >
                    <ShieldCheck className='h-4 w-4 text-indigo-500' />
                    <span>{t('account.admin')}</span>
                  </Link>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>

          <Link href='/' className='flex items-center gap-3'>
            <span
              className={cn(
                'font-serif',
                'text-base font-semibold uppercase tracking-[0.3em] md:text-lg',
                useDarkOverlayText ? 'text-white/90' : 'text-zinc-900 dark:text-white/90',
              )}
            >
              {siteName}
            </span>
          </Link>
        </div>
        <div className='pointer-events-auto flex items-center gap-2'>
          <nav
            className={cn(
              'hidden items-center gap-5 text-xs uppercase tracking-[0.2em] lg:flex',
              useDarkOverlayText ? 'text-white/70' : 'text-zinc-600 dark:text-zinc-300',
            )}
          >
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/' && pathname?.startsWith(item.href));
              const label = t(`items.${item.key}`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'transition-colors',
                    active
                      ? useDarkOverlayText
                        ? 'font-semibold text-white'
                        : 'font-semibold text-indigo-600 dark:text-indigo-400'
                      : useDarkOverlayText
                        ? 'hover:text-white'
                        : 'hover:text-zinc-900 dark:hover:text-white',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className={cn(
                  'h-8 w-8 rounded-full border shadow-sm backdrop-blur-md transition-colors',
                  isHome
                    ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                    : 'border-input bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                aria-label={t('search.open')}
              >
                <Search className='h-4 w-4' />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align='end'
              className={cn(
                'w-72 border p-3 shadow-xl backdrop-blur-md',
                isHome
                  ? 'border-white/20 bg-black/75 text-white'
                  : 'border-input bg-background/95 text-foreground'
              )}
            >
              <form className='flex items-center gap-2' onSubmit={handleSearchSubmit}>
                <Input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder={t('search.placeholder')}
                  className='h-9 rounded-full border-zinc-300 bg-white/80 px-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100'
                />
                <Button type='submit' size='sm' className='rounded-full px-4'>
                  {t('search.submit')}
                </Button>
              </form>
            </PopoverContent>
          </Popover>
          <LocaleSwitcher
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold shadow-sm backdrop-blur-md transition-colors',
              isHome
                ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                : 'border-input bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            itemClassName="rounded-sm px-2 py-1 text-sm transition hover:bg-accent hover:text-accent-foreground"
            activeItemClassName="bg-accent text-accent-foreground"
          />
          <ModeToggle
            className={cn(
              'h-8 w-8 rounded-full border shadow-sm backdrop-blur-md transition-colors',
              isHome
                ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                : 'border-input bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          />
          <DropdownMenu
            open={accountOpen}
            onOpenChange={setAccountOpen}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className={cn(
                  'h-8 w-8 rounded-full border shadow-sm backdrop-blur-md transition-colors',
                  isHome
                    ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                    : 'border-input bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                aria-label={user ? t('account.userInfo') : t('account.login')}
                onMouseEnter={handleAccountOpen}
                onMouseLeave={handleAccountClose}
              >
                {user ? (
                  <Avatar className='h-7 w-7'>
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={displayName} />
                    ) : null}
                    <AvatarFallback
                      className={cn(
                        'text-xs font-semibold',
                        isHome
                          ? 'bg-white/15 text-white'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-white',
                      )}
                    >
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <UserCircle className='h-4 w-4' />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              className={cn(accountPanelClass, 'p-4')}
              onMouseEnter={handleAccountOpen}
              onMouseLeave={handleAccountClose}
            >
              {user ? (
                <div className='space-y-4'>
                  <div className='flex items-center gap-3'>
                    <Avatar className='h-10 w-10 border border-white/10'>
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={displayName} />
                      ) : null}
                      <AvatarFallback
                        className={cn(
                          'text-sm font-semibold',
                          isHome
                            ? 'bg-white/15 text-white'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-white',
                        )}
                      >
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className='space-y-1'>
                      <p className='text-sm font-semibold'>{displayName}</p>
                      {email ? (
                        <p className={cn('text-xs', accountMutedTextClass)}>
                          {email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className={accountBadgeClass}>
                      {t('account.loggedIn')}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] uppercase tracking-[0.2em]',
                        accountSubtleTextClass,
                      )}
                    >
                      {t('account.welcome')}
                    </span>
                  </div>
                  {isAdmin ? (
                    <Button
                      asChild
                      variant='ghost'
                      className={menuItemClass}
                    >
                      <Link
                        href='/dashboard'
                        className='flex items-center gap-3'
                      >
                        <ShieldCheck className='h-4 w-4' />
                        {t('account.admin')}
                      </Link>
                    </Button>
                  ) : null}

                  <Button
                    variant='ghost'
                    className={menuItemClass}
                    onClick={() => setShowPasswordDialog(true)}
                  >
                    <KeyRound className='h-4 w-4' />
                    {t('account.changePassword')}
                  </Button>
                  
                  <form action={signOutAction} className='w-full'>
                    <Button
                      type='submit'
                      variant='ghost'
                      className={cn(
                        menuItemClass,
                        'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400',
                      )}
                    >
                      <LogOut className='h-4 w-4' />
                      {t('account.logout')}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className='space-y-3'>
                  <div className='space-y-1'>
                    <p
                      className={cn(
                        'text-[11px] uppercase tracking-[0.35em]',
                        accountSubtleTextClass,
                      )}
                    >
                      {t('account.title')}
                    </p>
                    <p className='text-sm font-semibold'>
                      {t('account.loginHint')}
                    </p>
                    <p className={cn('text-xs', accountMutedTextClass)}>
                      {t('account.loginDescription')}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant='outline'
                    className={loginButtonClass}
                  >
                    <Link
                      href={loginHref}
                      className='flex items-center justify-center gap-2'
                    >
                      <LogIn className='h-4 w-4' />
                      {t('account.login')}
                    </Link>
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>{t('account.changePassword')}</DialogTitle>
            <DialogDescription>
              {t('account.changePasswordDescription')}
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm 
            minPasswordLength={minPasswordLength}
            onSuccess={() => setShowPasswordDialog(false)} 
            onCancel={() => setShowPasswordDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}







