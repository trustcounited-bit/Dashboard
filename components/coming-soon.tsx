import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardCheckIcon } from '@/components/icons';

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <EmptyState
        icon={<ClipboardCheckIcon size={22} />}
        title="Coming in the next build phase"
        description="The foundation is in place — auth, role-routing, and dashboard. This page is wired into the navigation and will be filled in next."
      />
    </div>
  );
}
