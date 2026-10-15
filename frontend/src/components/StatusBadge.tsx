import React from 'react';
import { BugStatus } from '../types';

interface StatusBadgeProps {
  status: BugStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const labelMap: Record<BugStatus, string> = {
    open: 'Open',
    'in-progress': 'In Progress',
    closed: 'Closed',
  };

  return (
    <span className={`badge badge-${status}`}>
      {labelMap[status] || status}
    </span>
  );
};
