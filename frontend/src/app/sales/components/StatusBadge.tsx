import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OrderStatus = 'pending' | 'processed';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  pending: {
    label: 'Chưa xử lý',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100',
  },
  processed: {
    label: 'Đã xử lý',
    className: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  },
} as const;

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
} as const;

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        sizeClasses[size]
      )}
    >
      {config.label}
    </Badge>
  );
}
