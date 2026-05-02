// This file should never actually render - middleware redirects:
//  - unauthenticated users → /login
//  - admin/exec → /admin/dashboard
//  - main_supplier → /supplier/dashboard
// Render a minimal fallback just in case.
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
