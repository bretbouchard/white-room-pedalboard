import React from 'react';
import { cn } from '@/utils';

interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Grid: React.FC<GridProps> = ({
  children,
  cols = 1,
  gap = 'md',
  className,
}) => {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    12: 'grid-cols-12',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const gridClasses = cn('grid', colsClasses[cols], gapClasses[gap], className);

  return <div className={gridClasses}>{children}</div>;
};

interface GridItemProps {
  children: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
  className?: string;
}

const GridItem: React.FC<GridItemProps> = ({
  children,
  colSpan = 1,
  className,
}) => {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    8: 'col-span-8',
    12: 'col-span-12',
  };

  const itemClasses = cn(spanClasses[colSpan], className);

  return <div className={itemClasses}>{children}</div>;
};

export { Grid, GridItem };
