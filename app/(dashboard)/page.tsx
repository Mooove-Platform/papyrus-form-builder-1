import { redirect } from 'next/navigation';

// Index du groupe (dashboard) → on redirige vers /dashboard
export default function DashboardIndex() {
  redirect('/dashboard');
}
