import { requireSupplier } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSupplier();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={user.role} userEmail={user.email} userName={user.full_name} />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
