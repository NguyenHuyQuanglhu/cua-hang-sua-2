import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OrderStatus = 'pending' | 'processed' | 'printed' | 'unprinted' | 'debt_payment';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  isDebtPayment?: boolean;
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
  debt_payment: {
    label: 'Trả nợ',
    className: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100',
  },
  printed: {
    label: 'Đã in',
    className: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100',
  },
  unprinted: {
    label: 'Chưa in',
    className: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-100',
  },
} as const;

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
} as const;

export function StatusBadge({ status, size = 'md', isDebtPayment = false }: StatusBadgeProps) {
  // If it's a debt payment transaction, show special badge
  const effectiveStatus = isDebtPayment ? 'debt_payment' : status;
  const config = statusConfig[effectiveStatus] || statusConfig.pending; // Fallback to pending if status is invalid
  
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
