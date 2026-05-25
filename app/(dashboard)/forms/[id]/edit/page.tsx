'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { ArrowLeft, Eye, Send } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useForm } from '@/lib/store/use-forms';
import {
  addField,
  deleteField,
  duplicateField,
  reorderFields,
  updateField,
  updateForm
} from '@/lib/store/local-forms';
import type { Field, FieldType } from '@/types';

import { FieldPalette } from '@/components/builder/FieldPalette';
import { SortableFieldCard } from '@/components/builder/FieldCard';
import { FieldSettings } from '@/components/builder/FieldSettings';
import { FormDesignPanel } from '@/components/builder/FormDesignPanel';
import { FormHeader } from '@/components/builder/FormHeader';
import { FormHeaderSettings } from '@/components/builder/FormHeaderSettings';
import { PreviewModal } from '@/components/builder/PreviewModal';
import { getBackgroundStyle } from '@/lib/theme';
import type { FormTheme } from '@/types';

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { form, loading } = useForm(params.id);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedHeaderElement, setSelectedHeaderElement] = useState<'banner' | 'logo' | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Capteur pointer avec un seuil pour ne pas déclencher le drag sur un simple clic
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (form) setTitleDraft(form.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id]);

  if (loading) return null;
  if (!form) {
    return (
      <div className="p-20 text-center">
        <h1 className="font-display text-2xl">Formulaire introuvable</h1>
        <Link href="/forms" className="mt-4 inline-block text-accent-bold underline-offset-4 hover:underline">
          ← Retour
        </Link>
      </div>
    );
  }

  const fields = form.fields ?? [];
  const selected = fields.find((f) => f.id === selectedFieldId) ?? null;

  function handleAdd(type: FieldType) {
    const updated = addField(form!.id, type);
    if (!updated) return;
    const last = updated.fields?.[updated.fields.length - 1];
    if (last) setSelectedFieldId(last.id);
  }

  /** Cliquer sur un champ le sélectionne. Pour revenir au design global, cliquer dans le vide du canvas. */
  function selectField(id: string) {
    setSelectedFieldId(id);
    setSelectedHeaderElement(null);
  }

  function selectHeaderElement(element: 'banner' | 'logo') {
    setSelectedHeaderElement(element);
    setSelectedFieldId(null);
  }

  function clearSelection() {
    setSelectedFieldId(null);
    setSelectedHeaderElement(null);
  }

  function handleFieldChange(fieldId: string, patch: Partial<Field>) {
    updateField(form!.id, fieldId, patch);
  }

  function handleDuplicate(fieldId: string) {
    const result = duplicateField(form!.id, fieldId);
    if (result) setSelectedFieldId(result.newFieldId);
  }

  function handleDelete(fieldId: string) {
    deleteField(form!.id, fieldId);
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = fields.map((f) => f.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(ids, oldIdx, newIdx);
    reorderFields(form!.id, next);
  }

  function handleTitleBlur() {
    if (titleDraft && titleDraft !== form!.title) {
      updateForm(form!.id, { title: titleDraft });
    }
  }

  function handlePublish() {
    updateForm(form!.id, {
      status: form!.status === 'published' ? 'draft' : 'published',
      published_at: form!.status === 'published' ? null : new Date().toISOString()
    });
  }

  function handleThemeChange(patch: Partial<FormTheme>) {
    updateForm(form!.id, { theme: { ...form!.theme, ...patch } });
  }

  function handleFormChange(patch: Partial<import('@/types').Form>) {
    updateForm(form!.id, patch);
  }

  function handleModeChange(display_mode: import('@/types').DisplayMode) {
    updateForm(form!.id, { display_mode });
  }

  return (
    <div className="-mx-8 -my-6 flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between bg-bg-surface px-6 overflow-hidden transition-all duration-300"
        style={{
          height: isPreviewOpen ? '0px' : '3.5rem',
          minHeight: isPreviewOpen ? '0px' : '3.5rem',
          paddingTop: isPreviewOpen ? '0px' : undefined,
          paddingBottom: isPreviewOpen ? '0px' : undefined,
          borderBottom: isPreviewOpen ? 'none' : '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/forms')}
            className="text-text-secondary transition hover:text-text-primary"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="min-w-[200px] bg-transparent font-display text-lg outline-none transition focus:border-b focus:border-accent"
          />
          {form.status === 'draft' && <Badge variant="draft">Brouillon</Badge>}
          {form.status === 'published' && <Badge variant="published">Publié</Badge>}
          <span className="papyrus-meta ml-2 text-xs">i. {fields.length} champ{fields.length > 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewOpen(true)}
            style={{
              border: '1.5px solid #2AC2DE',
              color: '#052139',
              background: 'transparent',
              borderRadius: '8px',
              padding: '5px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Eye size={14} /> Aperçu
          </button>
          <Button variant="cta" size="sm" iconLeft={<Send className="h-4 w-4" />} onClick={handlePublish}>
            {form.status === 'published' ? 'Dépublier' : 'Publier'}
          </Button>
        </div>
      </div>

      {/* Conteneur des vues avec transition glissante */}
      <div className="relative flex-1 overflow-hidden" id="preview-container">
        {/* Vue éditeur */}
        <div
          className="absolute inset-0 flex"
          style={{
            ...getBackgroundStyle(form.theme),
            transform: isPreviewOpen ? 'translateY(-100%)' : 'translateY(0)',
            transition: 'transform 0.45s cubic-bezier(0.77, 0, 0.175, 1)'
          }}
        >
          {/* Palette */}
          <aside className="w-72 overflow-y-auto border-r border-border bg-bg-surface p-5">
            <FieldPalette onAdd={handleAdd} />
          </aside>

          {/* Canvas — clic dans le vide désélectionne (retour au panneau de design) */}
          <div
            className="flex-1 overflow-y-auto px-12 py-10 transition-colors"
            style={{ ['--accent' as string]: form.theme.accent }}
            onClick={(e) => {
              // Ne désélectionner que si on clique vraiment sur le canvas, pas sur ses enfants
              if (e.target === e.currentTarget) {
                clearSelection();
              }
            }}
          >
            <div className="mx-auto max-w-2xl">
              {/* Header fixe avec bannière et logo */}
              <FormHeader
                theme={form.theme}
                selectedElement={selectedHeaderElement}
                onSelectBanner={() => selectHeaderElement('banner')}
                onSelectLogo={() => selectHeaderElement('logo')}
                onThemeChange={handleThemeChange}
              />

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={rectSortingStrategy}>
                  {fields.length === 0 ? (
                    <EmptyCanvas />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {fields.map((field, i) => (
                        <SortableFieldCard
                          key={field.id}
                          field={field}
                          index={i}
                          selected={selectedFieldId === field.id}
                          globalStyle={form.theme.field_style}
                          cardBg={form.theme.field_bg_color}
                          onSelect={() => selectField(field.id)}
                          onChange={(patch) => handleFieldChange(field.id, patch)}
                          onDuplicate={() => handleDuplicate(field.id)}
                          onDelete={() => handleDelete(field.id)}
                        />
                      ))}
                    </div>
                  )}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Settings */}
          <aside className="w-80 overflow-y-auto border-l border-border bg-bg-surface p-5">
            {selected ? (
              <FieldSettings
                form={form}
                field={selected}
                globalStyle={form.theme.field_style}
                onChange={(patch) => handleFieldChange(selected.id, patch)}
              />
            ) : selectedHeaderElement ? (
              <FormHeaderSettings
                theme={form.theme}
                selectedElement={selectedHeaderElement}
                onChange={handleThemeChange}
              />
            ) : (
              <FormDesignPanel
                form={form}
                onChange={handleThemeChange}
                onFormChange={handleFormChange}
                onModeChange={handleModeChange}
              />
            )}
          </aside>
        </div>

        {/* VUE APERÇU — monte depuis le bas */}
        <div
          className="absolute inset-0"
          style={{
            transform: isPreviewOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.45s cubic-bezier(0.77, 0, 0.175, 1)'
          }}
        >
          <PreviewModal form={form} onClose={() => setIsPreviewOpen(false)} />
        </div>

      </div>

    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-16 text-center">
      <h3 className="font-display text-2xl">Commencez votre Papyrus</h3>
      <p className="papyrus-meta mt-2 text-sm">i. Choisissez un champ dans la palette de gauche</p>
      <div className="mx-auto mt-6 papyrus-divider w-24" />
      <p className="mt-4 text-xs text-text-tertiary">
        14 types disponibles · réorganisez par drag &amp; drop · sauvegarde auto
      </p>
    </div>
  );
}
