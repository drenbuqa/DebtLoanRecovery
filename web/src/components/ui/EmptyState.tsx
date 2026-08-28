import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Icon size={22} className="text-gray-400" />
      </div>
      <div>
        <div className="text-[13px] font-semibold text-gray-700 mb-1">{title}</div>
        {description && (
          <div className="text-[12px] text-gray-400 max-w-xs leading-relaxed">{description}</div>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 px-4 py-2 text-[12px] font-medium text-brand-700 border border-brand-200 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
