import React from 'react';
import { PRIORITY_META } from '../../constants/statusConstants';

export const PriorityBadge = ({ priority }) => {
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${meta.badgeClass}`}>
      <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
};
