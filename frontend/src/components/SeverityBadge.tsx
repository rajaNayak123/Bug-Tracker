import React from 'react';
import { BugSeverity } from '../types';

interface SeverityBadgeProps {
  severity: BugSeverity;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  return (
    <span className={`badge badge-${severity}`}>
      ● {severity === 'med' ? 'Medium' : severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
};
