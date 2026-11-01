import React from 'react';
import { PRIORITY_META } from '../../constants/statusConstants';
import { useTranslation } from '../../context/LanguageContext';

export const PriorityBadge = ({ priority }) => {
  const { t } = useTranslation();
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  const translatedLabel = t(`priorities.${priority}`) || meta.label;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${meta.badgeClass}`}>
      <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
      <span>{translatedLabel}</span>
    </span>
  );
};
