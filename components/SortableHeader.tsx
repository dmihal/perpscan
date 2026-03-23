'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortOrder } from '@/hooks/use-sortable';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortOrder: SortOrder;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  sortOrder,
  onSort,
  align = 'left',
  className,
}: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey;
  const Icon = isActive
    ? sortOrder === 'asc'
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;

  return (
    <th
      className={cn(
        'px-6 py-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn('flex items-center gap-1', align === 'right' && 'justify-end')}>
        {label}
        <Icon className={cn('h-3 w-3 shrink-0', !isActive && 'opacity-40')} />
      </div>
    </th>
  );
}
