'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { LogIn, ShieldCheck, UserCircle, KeyRound, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ModeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/locale-switcher';
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
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { ChangePasswordForm } from '@/app/ui/shared/change-password-form';
import { signOutAction } from '@/app/lib/actions';

const navItems = [
  { key: 'home', href: '/' },
  { key: 'gallery', href: '/gallery' },
  { key: 'photoCollections', href: '/photo-collections' },
  { key: 'videoCollections', href: '/video-collections' },
  { key: 'about', href: '/about' },
];

export function FloatingNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const isHome = pathname === '/';
  const loginHref = pathname
    ? `/login?callbackUrl=${encodeURIComponent(pathname)}`
    : '/login';
  const [accountOpen, setAccountOpen] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const accountCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { data: session } = authClient.useSession();
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
    return () => {
      clearAccountCloseTimer();
    };
  }, []);

  return (
    <div className='front-floating-nav fixed inset-x-0 top-0 z-50 pointer-events-none transition duration-200 ease-out'>
      <div className='flex items-center justify-between px-6 pt-6'>
        <Link href='/' className='pointer-events-auto flex items-center gap-3'>
          <span
            className={cn(
              'font-serif',
              'text-base font-semibold tracking-[0.35em] md:text-lg',
              isHome ? 'text-white/80' : 'text-zinc-800/90 dark:text-white/85',
            )}
          >
            LUMINA
          </span>
        </Link>
        <div className='pointer-events-auto flex items-center gap-2'>
          <nav
            className={cn(
              'hidden items-center gap-4 text-xs uppercase tracking-[0.2em] lg:flex',
              isHome ? 'text-white/60' : 'text-zinc-600/80 dark:text-white/60',
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
                    'transition',
                    active
                      ? isHome
                        ? 'text-white'
                        : 'text-zinc-900 dark:text-white'
                      : isHome
                        ? 'hover:text-white'
                        : 'hover:text-zinc-900 dark:hover:text-white',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
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
            onSuccess={() => setShowPasswordDialog(false)} 
            onCancel={() => setShowPasswordDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
