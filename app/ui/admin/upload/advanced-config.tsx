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

type AdvancedConfigProps = {
  value: TaskConfig;
  onChange: (value: TaskConfig) => void;
};

export function AdvancedConfig({ value, onChange }: AdvancedConfigProps) {
  const t = useTranslations('dashboard.upload');
  const [open, setOpen] = useState(false);

  const updateDuplicateHandling = (next: DuplicateHandling) => {
    onChange({
      ...value,
      duplicateHandling: next,
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

      <CollapsibleContent className="space-y-5 pt-4 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <section className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {t('concurrency')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              value={value.concurrency}
              onChange={(event) =>
                onChange({
                  ...value,
                  concurrency: Number(event.target.value),
                })
              }
              className="h-2 w-full accent-indigo-500"
            />
            <span className="w-8 text-right text-sm font-mono text-zinc-600 dark:text-zinc-300">
              {value.concurrency}
            </span>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {t('duplicateHandling')}
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
              <input
                type="radio"
                name="duplicateHandling"
                checked={value.duplicateHandling === 'skip'}
                onChange={() => updateDuplicateHandling('skip')}
                className="accent-indigo-500"
              />
              {t('duplicateSkip')}
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
              <input
                type="radio"
                name="duplicateHandling"
                checked={value.duplicateHandling === 'rename'}
                onChange={() => updateDuplicateHandling('rename')}
                className="accent-indigo-500"
              />
              {t('duplicateRename')}
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
              <input
                type="radio"
                name="duplicateHandling"
                checked={value.duplicateHandling === 'overwrite'}
                onChange={() => updateDuplicateHandling('overwrite')}
                className="accent-indigo-500"
              />
              {t('duplicateOverwrite')}
            </label>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {t('postProcessing')}
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
              <input
                type="checkbox"
                checked={value.postProcessing.autoTag}
                onChange={(event) =>
                  onChange({
                    ...value,
                    postProcessing: {
                      ...value.postProcessing,
                      autoTag: event.target.checked,
                    },
                  })
                }
                className="accent-indigo-500"
              />
              {t('autoTag')}
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
              <input
                type="checkbox"
                checked={value.postProcessing.videoTranscode}
                onChange={(event) =>
                  onChange({
                    ...value,
                    postProcessing: {
                      ...value.postProcessing,
                      videoTranscode: event.target.checked,
                    },
                  })
                }
                className="accent-indigo-500"
              />
              {t('videoTranscode')}
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
              <input
                type="checkbox"
                checked={value.postProcessing.imageCompress}
                onChange={(event) =>
                  onChange({
                    ...value,
                    postProcessing: {
                      ...value.postProcessing,
                      imageCompress: event.target.checked,
                    },
                  })
                }
                className="accent-indigo-500"
              />
              {t('imageCompress')}
            </label>
          </div>
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}