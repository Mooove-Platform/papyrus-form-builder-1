import type { createClient } from '@/lib/supabase/client';

/**
 * Le client Supabase de l'application, des deux côtés.
 *
 * Le type est emprunté à la fabrique du navigateur parce qu'elle et celle du
 * serveur produisent la même chose : un client ouvert sur le schéma `papyrus`.
 * L'emprunt est un import de TYPE seulement — il s'efface à la compilation et
 * n'entraîne donc pas le module `'use client'` dans une route serveur.
 */
type PapyrusClient = ReturnType<typeof createClient>;

/**
 * Le projet dans lequel atterrit un formulaire qu'on vient de créer.
 *
 * **Tout formulaire réel appartient à un projet.** La contrainte
 * `forms_project_required` le dit en base depuis la migration 003 — seuls les
 * modèles y échappent, parce qu'ils vivent hors de toute arborescence. Un
 * chemin de création qui oublie `project_id` ne crée donc pas un formulaire
 * orphelin : il échoue, et il échoue au moment de l'insertion, loin de l'oubli.
 *
 * C'est exactement ce qui est arrivé à l'import Tally, qui n'a jamais pu créer
 * un seul formulaire depuis que la contrainte existe. La règle vivait dans
 * `supabase-forms.ts`, un module `'use client'` qu'une route serveur ne peut
 * pas importer : elle était donc introuvable là où elle manquait. Elle vit ici,
 * sans attache au navigateur ni au serveur, et les deux côtés s'en servent.
 *
 * L'ordre de préférence : le projet demandé, sinon le dernier projet actif de
 * l'espace — celui que l'auteur vient de regarder — sinon un projet créé pour
 * l'occasion, parce qu'un premier import ne doit pas exiger qu'on soit d'abord
 * allé créer un projet à la main.
 */
export async function resolveDestinationProject(
  client: PapyrusClient,
  teamId: string,
  userId: string,
  customProjectId?: string
): Promise<string> {
  if (customProjectId) return customProjectId;

  const { data: existing, error } = await client
    .from('projects')
    .select('id')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Projet de destination introuvable:', error);
    throw new Error('Impossible de déterminer le projet de destination.');
  }

  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await client
    .from('projects')
    .insert({ team_id: teamId, created_by: userId, name: 'Mes formulaires' })
    .select('id')
    .single();

  if (createError || !created?.id) {
    console.error('Création du projet par défaut impossible:', createError);
    throw new Error('Impossible de créer un projet pour ce formulaire.');
  }

  return created.id as string;
}
