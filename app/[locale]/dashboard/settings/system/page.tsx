import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { fetchSystemSettings, fetchUserByEmail } from '@/app/lib/data';
import { saveSystemSettings } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function Page() {
  const t = await getTranslations('dashboard.settings.system');
  const tAbout = await getTranslations('front.about');
  const locale = await getLocale();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user?.email
    ? await fetchUserByEmail(session.user.email)
    : null;
  if (!user || user.role !== 'admin') {
    return <div>{t('forbidden')}</div>;
  }
  const settings = await fetchSystemSettings(user.id, locale);
  const aboutSettings = settings?.about ?? {};
  const defaultCapabilities = tAbout.raw('capabilities') as {
    title: string;
    description: string;
  }[];
  const defaultEquipment = tAbout.raw('equipmentItems') as {
    title: string;
    description: string;
    size?: 'wide';
  }[];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('description')}
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <form action={saveSystemSettings} className="space-y-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-zinc-800 dark:text-zinc-100">{t('siteName')}</Label>
              <Input
                name="siteName"
                defaultValue={settings?.siteName ?? ''}
                placeholder="Memorix Studio"
                className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-800 dark:text-zinc-100">{t('seoDescription')}</Label>
              <textarea
                name="seoDescription"
                rows={4}
                defaultValue={settings?.seoDescription ?? ''}
                placeholder={t('seoPlaceholder')}
                className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-white/60 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
              <label className="flex items-center gap-2">
                <input
                  name="publicAccess"
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700"
                  defaultChecked={settings?.publicAccess ?? true}
                />
                {t('publicAccess')}
              </label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t('publicAccessDesc')}
              </span>
            </div>
          </div>

          <div className="space-y-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {t('aboutSection.title')}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t('aboutSection.description')}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-zinc-800 dark:text-zinc-100">{t('about.eyebrow')}</Label>
                <Input
                  name="aboutEyebrow"
                  defaultValue={aboutSettings.eyebrow ?? ''}
                  placeholder={tAbout('eyebrow')}
                  className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-800 dark:text-zinc-100">{t('about.title')}</Label>
                <Input
                  name="aboutTitle"
                  defaultValue={aboutSettings.title ?? ''}
                  placeholder={tAbout('title')}
                  className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-800 dark:text-zinc-100">{t('about.description')}</Label>
              <textarea
                name="aboutDescription"
                rows={3}
                defaultValue={aboutSettings.description ?? ''}
                placeholder={tAbout('description')}
                className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-zinc-800 dark:text-zinc-100">{t('about.manifestoTitle')}</Label>
                <Input
                  name="manifestoTitle"
                  defaultValue={aboutSettings.manifestoTitle ?? ''}
                  placeholder={tAbout('manifesto.title')}
                  className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-800 dark:text-zinc-100">{t('about.manifestoDescription')}</Label>
                <textarea
                  name="manifestoDescription"
                  rows={2}
                  defaultValue={aboutSettings.manifestoDescription ?? ''}
                  placeholder={tAbout('manifesto.description')}
                  className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {t('about.capabilities.title')}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {defaultCapabilities.map((item, index) => {
                  const current = aboutSettings.capabilities?.[index] ?? {};
                  return (
                    <div key={`capability-${index}`} className="space-y-2">
                      <Input
                        name={`capabilityTitle${index}`}
                        defaultValue={current?.title ?? ''}
                        placeholder={item.title}
                        className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                      />
                      <textarea
                        name={`capabilityDescription${index}`}
                        rows={2}
                        defaultValue={current?.description ?? ''}
                        placeholder={item.description}
                        className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {t('about.equipment.title')}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-zinc-800 dark:text-zinc-100">{t('about.equipment.eyebrow')}</Label>
                  <Input
                    name="equipmentEyebrow"
                    defaultValue={aboutSettings.equipmentSection?.eyebrow ?? ''}
                    placeholder={tAbout('equipmentSection.eyebrow')}
                    className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-800 dark:text-zinc-100">{t('about.equipment.titleLabel')}</Label>
                  <Input
                    name="equipmentTitle"
                    defaultValue={aboutSettings.equipmentSection?.title ?? ''}
                    placeholder={tAbout('equipmentSection.title')}
                    className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-800 dark:text-zinc-100">{t('about.equipment.description')}</Label>
                <textarea
                  name="equipmentDescription"
                  rows={2}
                  defaultValue={aboutSettings.equipmentSection?.description ?? ''}
                  placeholder={tAbout('equipmentSection.description')}
                  className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {defaultEquipment.map((item, index) => {
                  const current = aboutSettings.equipmentItems?.[index] ?? {};
                  return (
                    <div key={`equipment-${index}`} className="space-y-2">
                      <Input
                        name={`equipmentItemTitle${index}`}
                        defaultValue={current?.title ?? ''}
                        placeholder={item.title}
                        className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                      />
                      <textarea
                        name={`equipmentItemDescription${index}`}
                        rows={2}
                        defaultValue={current?.description ?? ''}
                        placeholder={item.description}
                        className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Button type="submit">{t('save')}</Button>
        </form>
      </div>
    </div>
  );
}
