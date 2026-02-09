import { cn } from '@/lib/utils';
import { getLocale, getTranslations } from 'next-intl/server';
import { fetchPublicSystemSettings } from '@/app/lib/data';
import Image from 'next/image';
import { Github, Globe, Mail, MessageCircle, Send, Twitter, Instagram, Link as LinkIcon } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
    email: Mail,
    github: Github,
    wechat: MessageCircle,
    telegram: Send,
    weibo: Globe,
    twitter: Twitter,
    instagram: Instagram,
    website: LinkIcon,
    other: Globe
};

export default async function Page() {
  const t = await getTranslations('front.about');
  const locale = await getLocale();
  const settings = await fetchPublicSystemSettings(locale);
  const aboutSettings = settings?.about ?? {};

  // Data resolution
  const avatar = aboutSettings.avatar;
  const name = aboutSettings.name?.trim();
  const location = aboutSettings.location?.trim();
  const bio = aboutSettings.bio?.trim();
  const commonEquipment = aboutSettings.commonEquipment?.trim();
  const contacts = aboutSettings.contacts;
  const legacyContact = aboutSettings.contact;

  const hasContacts = contacts && contacts.length > 0;
  const hasLegacyContacts = legacyContact && (legacyContact.email || legacyContact.github || legacyContact.wechat || legacyContact.telegram || legacyContact.weibo);

  return (
    <div className="space-y-16">
      {/* Standard Header (Restored) */}
      <header className="front-fade-up space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60">
          {t('eyebrow')}
        </p>
        <h1
          className={cn(
            'font-serif',
            'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl',
          )}
        >
          {name || t('title')}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600/80 dark:text-white/60">
          {t('description')}
        </p>
      </header>

      {/* Personal Profile Section */}
      <section className="front-fade-up grid gap-12 md:grid-cols-[240px_1fr] md:gap-20">
        {/* Left Column: Avatar & Quick Info */}
        <div className="flex flex-col items-start space-y-6">
          {avatar && (
            <div className="relative h-40 w-40 overflow-hidden rounded-full border-2 border-zinc-100 shadow-xl ring-1 ring-zinc-900/5 dark:border-zinc-800 dark:ring-white/10 md:h-60 md:w-60">
              <Image
                src={avatar}
                alt={name || t('avatar')}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          )}
          
          <div className="space-y-4">
             {location && (
                 <div className="space-y-1">
                     <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                        {t('location')}
                     </p>
                     <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {location}
                     </p>
                 </div>
             )}
             
             {/* Contact Icons */}
             <div className="flex flex-wrap gap-4 pt-2">
                {/* New Dynamic Contacts */}
                {hasContacts && contacts.map((c) => {
                    const Icon = ICON_MAP[c.type] || Globe;
                    
                    // Determine Href based on type
                    let href = c.value;
                    if (c.type === 'email') href = `mailto:${c.value}`;
                    else if (c.type === 'github' && !c.value.startsWith('http')) href = `https://github.com/${c.value}`;
                    else if (c.type === 'telegram' && !c.value.startsWith('http')) href = `https://t.me/${c.value}`;
                    else if (c.type === 'weibo' && !c.value.startsWith('http')) href = `https://weibo.com/${c.value}`;
                    else if (c.type === 'twitter' && !c.value.startsWith('http')) href = `https://x.com/${c.value}`;
                    else if (c.type === 'instagram' && !c.value.startsWith('http')) href = `https://instagram.com/${c.value}`;
                    
                    // WeChat Special Case (Tooltip)
                    if (c.type === 'wechat') {
                         return (
                            <div key={c.id} className="group relative cursor-help" title={c.label}>
                                <span className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                    {c.value}
                                </span>
                            </div>
                         );
                    }

                    return (
                         <a 
                            key={c.id}
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                            title={c.label}
                         >
                            <Icon className="h-5 w-5" />
                         </a>
                    );
                })}

                {/* Legacy Fallback (only if no new contacts) */}
                {!hasContacts && hasLegacyContacts && legacyContact && (
                    <>
                        {legacyContact.email && (
                            <a href={`mailto:${legacyContact.email}`} className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100" title={t('contactFields.email')}>
                                <Mail className="h-5 w-5" />
                            </a>
                        )}
                        {legacyContact.github && (
                            <a href={`https://github.com/${legacyContact.github}`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100" title={t('contactFields.github')}>
                                <Github className="h-5 w-5" />
                            </a>
                        )}
                        {legacyContact.wechat && (
                            <div className="group relative cursor-help">
                                <span className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
                                    <MessageCircle className="h-5 w-5" />
                                </span>
                                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                    {legacyContact.wechat}
                                </span>
                            </div>
                        )}
                        {legacyContact.telegram && (
                            <a href={`https://t.me/${legacyContact.telegram}`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100" title={t('contactFields.telegram')}>
                                <Send className="h-5 w-5" />
                            </a>
                        )}
                        {legacyContact.weibo && (
                            <a href={legacyContact.weibo.startsWith('http') ? legacyContact.weibo : `https://weibo.com/${legacyContact.weibo}`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100" title={t('contactFields.weibo')}>
                                <Globe className="h-5 w-5" />
                            </a>
                        )}
                    </>
                )}
             </div>
          </div>
        </div>

        {/* Right Column: Bio & Equipment */}
        <div className="space-y-10">
            {(name || bio) && (
                <div className="space-y-6">
                    {bio && (
                        <div className="whitespace-pre-wrap text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {bio}
                        </div>
                    )}
                </div>
            )}

            {commonEquipment && (
                <div className="space-y-4 border-t border-zinc-200/60 pt-10 dark:border-zinc-800/60">
                    <h3 className="font-serif text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        {t('commonEquipment')}
                    </h3>
                    <div className="whitespace-pre-wrap font-mono text-sm leading-7 text-zinc-500">
                        {commonEquipment}
                    </div>
                </div>
            )}
        </div>
      </section>
    </div>
  );
}
