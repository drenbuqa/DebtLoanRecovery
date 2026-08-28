import { cn } from "@/lib/utils";

type Variant = "default" | "active" | "inactive" | "closed" | "warning" | "success" | "danger" | "purple" | "legal";

const variants: Record<Variant, string> = {
  default:  "bg-gray-100 text-gray-600",
  active:   "bg-green-50 text-green-700",
  inactive: "bg-yellow-50 text-yellow-700",
  closed:   "bg-gray-100 text-gray-500",
  warning:  "bg-amber-50 text-amber-700",
  success:  "bg-emerald-50 text-emerald-700",
  danger:   "bg-red-50 text-red-700",
  purple:   "bg-brand-50 text-brand-700",
  legal:    "bg-brand-50 text-brand-700",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
