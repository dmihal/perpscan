'use client';

import { useState, useMemo } from 'react';

export type SortOrder = 'asc' | 'desc';

export function useSortable<T>(
  data: T[],
  defaultKey?: keyof T & string,
  defaultOrder: SortOrder = 'desc'
) {
  const [sortKey, setSortKey] = useState<(keyof T & string) | null>(defaultKey ?? null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultOrder);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] as unknown;
      const bVal = b[sortKey] as unknown;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [data, sortKey, sortOrder]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key as keyof T & string);
      setSortOrder('desc');
    }
  }

  return { sortedData, sortKey, sortOrder, toggleSort };
}
