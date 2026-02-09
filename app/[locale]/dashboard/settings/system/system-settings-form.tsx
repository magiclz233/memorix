'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaPicker } from '@/app/ui/dashboard/media-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saveSystemSettings } from '@/app/lib/actions';
import { SystemSettings, ContactItem } from '@/app/lib/data';
import { 
  UploadCloud, 
  Plus, 
  Trash2, 
  Mail, 
  Github, 
  MessageCircle, 
  Send, 
  Globe, 
  Twitter, 
  Instagram, 
  Link as LinkIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SystemSettingsFormProps = {
  settings: SystemSettings | null;
};

const PLATFORMS = [
  { value: 'email', label: 'Email', icon: Mail, placeholder: 'name@example.com' },
  { value: 'github', label: 'GitHub', icon: Github, placeholder: 'username' },
  { value: 'wechat', label: 'WeChat', icon: MessageCircle, placeholder: 'WeChat ID' },
  { value: 'telegram', label: 'Telegram', icon: Send, placeholder: 'username' },
  { value: 'weibo', label: 'Weibo', icon: Globe, placeholder: 'Weibo ID or URL' },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'username' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'username' },
  { value: 'website', label: 'Website', icon: LinkIcon, placeholder: 'https://...' },
  { value: 'other', label: 'Other', icon: Globe, placeholder: 'Content' },
];

export function SystemSettingsForm({ settings }: SystemSettingsFormProps) {
  const t = useTranslations('dashboard.settings.system');
  const tAbout = useTranslations('front.about');
  
  const aboutSettings = settings?.about ?? {};
  
  // State initialization
  const [avatarUrl, setAvatarUrl] = useState(aboutSettings.avatar || '');
  const [contacts, setContacts] = useState<ContactItem[]>(() => {
    if (aboutSettings.contacts && aboutSettings.contacts.length > 0) {
      return aboutSettings.contacts;
    }
    // Migration logic
    const legacy = aboutSettings.contact || {};
    const items: ContactItem[] = [];
    if (legacy.email) items.push({ id: 'legacy-1', type: 'email', label: 'Email', value: legacy.email });
    if (legacy.github) items.push({ id: 'legacy-2', type: 'github', label: 'GitHub', value: legacy.github });
    if (legacy.wechat) items.push({ id: 'legacy-3', type: 'wechat', label: 'WeChat', value: legacy.wechat });
    if (legacy.telegram) items.push({ id: 'legacy-4', type: 'telegram', label: 'Telegram', value: legacy.telegram });
    if (legacy.weibo) items.push({ id: 'legacy-5', type: 'weibo', label: 'Weibo', value: legacy.weibo });
    return items;
  });

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  
  // New Contact Form State
  const [newContactType, setNewContactType] = useState('email');
  const [newContactLabel, setNewContactLabel] = useState('Email');
  const [newContactValue, setNewContactValue] = useState('');

  const handleAvatarSelect = (items: any[]) => {
    if (items.length > 0) {
      const item = items[0];
      setAvatarUrl(item.url || item.thumbUrl || '');
    }
    setIsAvatarPickerOpen(false);
  };

  const handleAddContact = () => {
    if (!newContactValue.trim()) return;
    
    const newItem: ContactItem = {
        id: crypto.randomUUID(),
        type: newContactType,
        label: newContactLabel,
        value: newContactValue.trim()
    };
    
    setContacts([...contacts, newItem]);
    setNewContactValue('');
    setIsContactDialogOpen(false);
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const updateContact = (id: string, field: keyof ContactItem, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  return (
    <form action={saveSystemSettings} className="space-y-8">
      {/* Hidden inputs */}
      <input type="hidden" name="aboutAvatar" value={avatarUrl} />
      <input type="hidden" name="aboutContactsJson" value={JSON.stringify(contacts)} />
      
      {/* Avatar Selection */}
      <div className="space-y-4">
        <Label className="text-zinc-800 dark:text-zinc-100">{tAbout('avatar')}</Label>
        <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
            {avatarUrl ? (
                <Image 
                src={avatarUrl} 
                alt="Avatar" 
                fill 
                className="object-cover"
                unoptimized
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400">
                <UploadCloud className="h-8 w-8" />
                </div>
            )}
            </div>
            <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAvatarPickerOpen(true)}>
                {t('changeAvatar')}
            </Button>
            {avatarUrl && (
                <Button type="button" variant="ghost" onClick={() => setAvatarUrl('')}>
                {t('removeAvatar')}
                </Button>
            )}
            </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-zinc-800 dark:text-zinc-100">{tAbout('name')}</Label>
          <Input
            name="aboutName"
            defaultValue={aboutSettings.name ?? aboutSettings.title ?? ''}
            placeholder="e.g. John Doe"
            className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-800 dark:text-zinc-100">{tAbout('location')}</Label>
          <Input
            name="aboutLocation"
            defaultValue={aboutSettings.location ?? ''}
            placeholder="e.g. Shanghai, China"
            className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
          />
        </div>
      </div>

      {/* Dynamic Contacts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Label className="text-zinc-800 dark:text-zinc-100">{tAbout('contact')}</Label>
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-2">
                        <Plus className="h-3.5 w-3.5" />
                        Add Contact
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Contact Method</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Platform</Label>
                            <Select 
                                value={newContactType} 
                                onValueChange={(val) => {
                                    setNewContactType(val);
                                    const p = PLATFORMS.find(p => p.value === val);
                                    if (p) setNewContactLabel(p.label);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PLATFORMS.map(p => (
                                        <SelectItem key={p.value} value={p.value}>
                                            <div className="flex items-center gap-2">
                                                <p.icon className="h-4 w-4" />
                                                <span>{p.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Label</Label>
                            <Input 
                                value={newContactLabel}
                                onChange={(e) => setNewContactLabel(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Content / Value</Label>
                            <Input 
                                value={newContactValue}
                                onChange={(e) => setNewContactValue(e.target.value)}
                                placeholder={PLATFORMS.find(p => p.value === newContactType)?.placeholder}
                            />
                        </div>
                        <Button type="button" onClick={handleAddContact}>Add</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid gap-3">
            {contacts.map((contact) => {
                const PlatformIcon = PLATFORMS.find(p => p.value === contact.type)?.icon || Globe;
                return (
                    <div key={contact.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                            <PlatformIcon className="h-5 w-5" />
                        </div>
                        <div className="grid flex-1 gap-2 sm:grid-cols-2">
                            <Input 
                                value={contact.label}
                                onChange={(e) => updateContact(contact.id, 'label', e.target.value)}
                                className="h-9 border-transparent bg-transparent px-2 font-medium focus-visible:border-zinc-200 focus-visible:bg-white dark:focus-visible:border-zinc-800 dark:focus-visible:bg-black"
                                placeholder="Label"
                            />
                            <Input 
                                value={contact.value}
                                onChange={(e) => updateContact(contact.id, 'value', e.target.value)}
                                className="h-9 border-transparent bg-transparent px-2 text-zinc-500 focus-visible:border-zinc-200 focus-visible:bg-white focus-visible:text-zinc-900 dark:focus-visible:border-zinc-800 dark:focus-visible:bg-black dark:focus-visible:text-zinc-100"
                                placeholder="Value"
                            />
                        </div>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => removeContact(contact.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            })}
            {contacts.length === 0 && (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-400 dark:border-zinc-800">
                    No contacts added
                </div>
            )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-800 dark:text-zinc-100">{tAbout('bio')}</Label>
        <textarea
          name="aboutBio"
          rows={5}
          defaultValue={aboutSettings.bio ?? aboutSettings.description ?? ''}
          placeholder="Personal introduction..."
          className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-800 dark:text-zinc-100">{tAbout('commonEquipment')}</Label>
        <textarea
          name="commonEquipment"
          rows={4}
          defaultValue={aboutSettings.commonEquipment ?? ''}
          placeholder="Sony A7R5, 24-70 GM II..."
          className="w-full rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100"
        />
        <p className="text-xs text-zinc-500">{t('equipmentHelp')}</p>
      </div>

      {/* Legacy Fields (Hidden or Removed) */}
       <div className="space-y-2 hidden">
            <Label className="text-zinc-800 dark:text-zinc-100">{t('siteName')}</Label>
            <Input
                name="siteName"
                defaultValue={settings?.siteName ?? ''}
                className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
        </div>
         <div className="space-y-2 hidden">
            <Label className="text-zinc-800 dark:text-zinc-100">{t('seoDescription')}</Label>
            <Input
                name="seoDescription"
                defaultValue={settings?.seoDescription ?? ''}
                className="border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
        </div>

      <div className="flex items-center gap-2">
        <input
            type="checkbox"
            name="publicAccess"
            id="publicAccess"
            defaultChecked={settings?.publicAccess ?? false}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
        />
        <Label htmlFor="publicAccess" className="text-zinc-800 dark:text-zinc-100">
            {t('publicAccess')}
        </Label>
      </div>

      <div className="flex justify-end">
        <Button type="submit">{t('save')}</Button>
      </div>

      <Dialog open={isAvatarPickerOpen} onOpenChange={setIsAvatarPickerOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{t('selectAvatar')}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
                 <MediaPicker
                    selectionMode="single"
                    allowedMediaTypes={['image']}
                    onConfirm={() => {}}
                    onConfirmItems={handleAvatarSelect}
                    onCancel={() => setIsAvatarPickerOpen(false)}
                 />
            </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
