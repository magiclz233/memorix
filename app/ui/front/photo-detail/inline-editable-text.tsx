'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type InlineEditableTextProps = {
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  editable: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  type?: string;
};

export function InlineEditableText({
  value,
  onChange,
  onSave,
  editable,
  className,
  inputClassName,
  placeholder,
  type = 'text',
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    onSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-transparent border-b border-indigo-400 outline-none',
          inputClassName,
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className={cn(
        className,
        editable
          ? 'cursor-text hover:underline decoration-dashed decoration-zinc-400/70 underline-offset-[6px]'
          : '',
      )}
      onClick={() => {
        if (editable) setIsEditing(true);
      }}
      title={editable ? '点击修改' : undefined}
    >
      {value || placeholder}
    </span>
  );
}