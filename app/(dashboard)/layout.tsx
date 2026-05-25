import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { IS_LOCAL_MODE } from '@/lib/mode';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let teamName = 'Démo locale';
  let userEmail = 'local@papyrus.dev';

  if (!IS_LOCAL_MODE) {
    // Branchement Supabase quand on quittera le mode local
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id, role, teams(name)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const teamsRel = membership?.teams as unknown;
    teamName =
      (Array.isArray(teamsRel) ? teamsRel[0]?.name : (teamsRel as { name?: string } | null)?.name) ??
      'Mon équipe';
    userEmail = user.email ?? '';
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar teamName={teamName} userEmail={userEmail} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="relative flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
