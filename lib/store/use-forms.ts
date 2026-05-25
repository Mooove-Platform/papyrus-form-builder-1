'use client';

import { useEffect, useState } from 'react';
import type { Form } from '@/types';
import { getForm, listForms } from './local-forms';

/** Hook qui s'abonne aux changements localStorage du store Papyrus. */
export function useForms(): Form[] {
  const [forms, setForms] = useState<Form[]>([]);

  useEffect(() => {
    setForms(listForms());
    const refresh = () => setForms(listForms());
    window.addEventListener('papyrus:forms-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('papyrus:forms-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return forms;
}

export function useForm(id: string): { form: Form | null; loading: boolean } {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setForm(getForm(id));
    setLoading(false);
    const refresh = () => setForm(getForm(id));
    window.addEventListener('papyrus:forms-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('papyrus:forms-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [id]);

  return { form, loading };
}
