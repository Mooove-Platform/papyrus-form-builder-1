'use client';

import { useEffect, useState } from 'react';
import type { Form } from '@/types';
import { getForm, listForms } from './index';

/** Hook qui s'abonne aux changements localStorage du store Papyrus. */
export function useForms(): Form[] {
  const [forms, setForms] = useState<Form[]>([]);

  useEffect(() => {
    const loadForms = async () => {
      try {
        const result = await listForms();
        setForms(result);
      } catch (error) {
        console.error('Failed to load forms:', error);
        setForms([]);
      }
    };

    loadForms();

    const refresh = () => {
      loadForms();
    };

    window.addEventListener('papyrus:forms-changed', refresh);
    window.addEventListener('papyrus:form-created', refresh);
    window.addEventListener('papyrus:form-updated', refresh);
    window.addEventListener('papyrus:form-deleted', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('papyrus:forms-changed', refresh);
      window.removeEventListener('papyrus:form-created', refresh);
      window.removeEventListener('papyrus:form-updated', refresh);
      window.removeEventListener('papyrus:form-deleted', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return forms;
}

export function useForm(id: string): { form: Form | null; loading: boolean } {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);
      try {
        const result = await getForm(id);
        setForm(result);
      } catch (error) {
        console.error('Failed to load form:', error);
        setForm(null);
      } finally {
        setLoading(false);
      }
    };

    loadForm();

    // form-updated carries the full updated form in its detail — use it directly,
    // no DB round-trip and no setLoading(true) which would flash the page.
    const handleFormUpdated = (e: Event) => {
      const { formId, form: updatedForm } = (e as CustomEvent<{ formId: string; form: Form }>).detail;
      if (formId === id) setForm(updatedForm);
    };

    const handleFormDeleted = (e: Event) => {
      const { formId } = (e as CustomEvent<{ formId: string }>).detail;
      if (formId === id) setForm(null);
    };

    // storage: covers localStorage mode changes from other tabs/components
    const refreshFromStorage = () => { loadForm(); };

    window.addEventListener('papyrus:form-updated', handleFormUpdated);
    window.addEventListener('papyrus:form-deleted', handleFormDeleted);
    window.addEventListener('storage', refreshFromStorage);
    return () => {
      window.removeEventListener('papyrus:form-updated', handleFormUpdated);
      window.removeEventListener('papyrus:form-deleted', handleFormDeleted);
      window.removeEventListener('storage', refreshFromStorage);
    };
  }, [id]);

  return { form, loading };
}
