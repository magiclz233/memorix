'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { DuplicateHandling, TaskConfig } from '@/app/lib/definitions';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type AdvancedConfigProps = {
  value: TaskConfig;
  onChange: (value: TaskConfig) => void;
};

export function AdvancedConfig({ value, onChange }: AdvancedConfigProps) {
  const t = useTranslations('dashboard.upload');
  const [open, setOpen] = useState(false);

  const updateDuplicateHandling = (next: string) => {
    onChange({
      ...value,
      duplicateHandling: next as DuplicateHandling,
    });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          {t('advancedConfig')}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-6 pt-5 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('concurrency')}
            </Label>
            <span className="text-sm font-mono font-medium text-indigo-600 dark:text-indigo-400">
              {value.concurrency}
            </span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[value.concurrency]}
            onValueChange={([val]) =>
              onChange({
                ...value,
                concurrency: val,
              })
            }
            className="w-full"
          />
        </section>

        <section className="space-y-3">
          <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {t('duplicateHandling')}
          </Label>

          <RadioGroup 
            value={value.duplicateHandling} 
            onValueChange={updateDuplicateHandling}
            className="grid gap-2 sm:grid-cols-3"
          >
            {[
              { id: 'skip', label: t('duplicateSkip') },
              { id: 'rename', label: t('duplicateRename') },
              { id: 'overwrite', label: t('duplicateOverwrite') },
            ].map((option) => (
              <div key={option.id}>
                <RadioGroupItem
                  value={option.id}
                  id={option.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.id}
                  className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-zinc-200 bg-white p-3 text-sm font-medium hover:bg-zinc-50 peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:peer-data-[state=checked]:border-indigo-500 dark:peer-data-[state=checked]:text-indigo-400"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </section>

        <section className="space-y-4 pt-2">
          <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {t('postProcessing')}
          </Label>

          <div className="space-y-3">
            {[
              { id: 'autoTag', label: t('autoTag'), checked: value.postProcessing.autoTag },
              { id: 'videoTranscode', label: t('videoTranscode'), checked: value.postProcessing.videoTranscode },
              { id: 'imageCompress', label: t('imageCompress'), checked: value.postProcessing.imageCompress },
            ].map((option) => (
              <div key={option.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <Label htmlFor={option.id} className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {option.label}
                </Label>
                <Switch
                  id={option.id}
                  checked={option.checked}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...value,
                      postProcessing: {
                        ...value.postProcessing,
                        [option.id]: checked,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}