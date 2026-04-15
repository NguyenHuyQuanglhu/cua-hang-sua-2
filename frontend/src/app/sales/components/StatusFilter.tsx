import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterStatus = 'all' | 'pending' | 'processed';

interface StatusFilterProps {
  selectedStatus: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  counts: {
    pending: number;
    processed: number;
  };
}

export function StatusFilter({ selectedStatus, onStatusChange, counts }: StatusFilterProps) {
  const options = [
    { value: 'all' as const, label: 'Tất cả', count: counts.pending + counts.processed },
    { value: 'pending' as const, label: 'Chưa xử lý', count: counts.pending },
    { value: 'processed' as const, label: 'Đã xử lý', count: counts.processed },
  ];

  return (
    <div className="flex items-center gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={selectedStatus === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusChange(option.value)}
          className={cn(
            "gap-2",
            selectedStatus === option.value && "shadow-sm"
          )}
        >
          {option.label}
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            selectedStatus === option.value 
              ? "bg-primary-foreground text-primary" 
              : "bg-muted text-muted-foreground"
          )}>
            {option.count}
          </span>
        </Button>
      ))}
    </div>
  );
}
