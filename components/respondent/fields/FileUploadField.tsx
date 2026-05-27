'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';

export interface FileUploadFieldProps {
  type: 'image' | 'video' | 'file';
  enabled: boolean;
  required?: boolean;
  preview: boolean;
}

export function FileUploadField({ type, enabled, required, preview }: FileUploadFieldProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputId = `${type}-${Math.random().toString(36).slice(2, 8)}`;

  if (!enabled) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border bg-bg-base text-xs text-text-tertiary">
        Mode désactivé
      </div>
    );
  }

  const acceptTypes = {
    image: 'image/*',
    video: 'video/*',
    file: 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
  };

  const placeholders = {
    image: 'Choisir une image ou glissez-la ici',
    video: 'Choisir une vidéo ou glissez-la ici',
    file: 'Choisir un fichier ou glissez-le ici'
  };

  return (
    <label
      htmlFor={inputId}
      className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-border-strong bg-bg-base px-4 py-6 text-sm text-text-secondary cursor-pointer transition-colors duration-200 hover:border-[var(--accent)] hover:bg-[var(--papyrus-surface)]"
    >
      <Upload className="h-5 w-5" />
      {fileName ? (
        <span className="break-all text-center text-text-primary">{fileName}</span>
      ) : (
        <span className="text-center">
          <span className="text-text-primary underline-offset-4">{placeholders[type]}</span>
          <span className="block text-xs text-text-tertiary">
            JPG, PNG, PDF, DOC... · Max 10 MB
          </span>
        </span>
      )}
      <input
        id={inputId}
        type="file"
        accept={acceptTypes[type]}
        className="hidden"
        required={required && !preview}
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
}