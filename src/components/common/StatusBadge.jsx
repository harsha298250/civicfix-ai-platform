import React from 'react';
import { STATUS_META, COMPLAINT_STATUS } from '../../constants/statusConstants';
import { useTranslation } from '../../context/LanguageContext';

export const StatusBadge = ({ status, showDot = true, showIcon = true, size = 'md' }) => {
  const { t } = useTranslation();
  const meta = STATUS_META[status] || STATUS_META[COMPLAINT_STATUS.SUBMITTED];
  const translatedLabel = t(`status.${status}`) || meta.label;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-label-sm px-2.5 py-1',
    lg: 'text-label-md px-3 py-1.5'
  }[size] || 'text-label-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all ${meta.badgeClass} ${sizeClasses}`}
      title={meta.description}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass} ${status === COMPLAINT_STATUS.IN_PROGRESS ? 'animate-pulse' : ''}`} />
      )}
      {showIcon && meta.icon && (
        <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
      )}
      <span>{translatedLabel}</span>
    </span>
  );
};
