export const COMPLAINT_STATUS = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLUTION_SUBMITTED: 'RESOLUTION_SUBMITTED',
  RESOLVED: 'RESOLVED',
  REWORK_REQUESTED: 'REWORK_REQUESTED',
  REOPENED: 'REOPENED',
  REJECTED: 'REJECTED'
};

export const STATUS_META = {
  SUBMITTED: {
    label: 'Submitted',
    badgeClass: 'bg-surface-container text-on-surface border border-outline-variant/40',
    dotClass: 'bg-outline',
    icon: 'send',
    description: 'Complaint submitted by citizen and pending municipal triage.'
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    badgeClass: 'bg-amber-500/10 text-amber-700 border border-amber-500/20',
    dotClass: 'bg-amber-500',
    icon: 'rate_review',
    description: 'Municipal Officer is assessing severity, department routing, and AI triage data.'
  },
  ASSIGNED: {
    label: 'Assigned',
    badgeClass: 'bg-secondary-fixed text-on-secondary-fixed border border-secondary/20',
    dotClass: 'bg-secondary',
    icon: 'assignment_ind',
    description: 'Work order assigned to rapid field maintenance crew.'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'bg-primary/10 text-primary border border-primary/20',
    dotClass: 'bg-primary',
    icon: 'engineering',
    description: 'Field crew has initiated active on-site repairs.'
  },
  RESOLUTION_SUBMITTED: {
    label: 'Resolution Submitted',
    badgeClass: 'bg-secondary-container/20 text-secondary border border-secondary-container',
    dotClass: 'bg-secondary-container',
    icon: 'fact_check',
    description: 'Repair work complete; awaiting Municipal Officer inspection & verification.'
  },
  RESOLVED: {
    label: 'Verified Resolved',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
    dotClass: 'bg-emerald-600',
    icon: 'check_circle',
    description: 'Inspection complete and resolution officially approved by municipal officer.'
  },
  REWORK_REQUESTED: {
    label: 'Rework Requested',
    badgeClass: 'bg-amber-600/10 text-amber-800 border border-amber-600/20',
    dotClass: 'bg-amber-700',
    icon: 'replay',
    description: 'Resolution evidence did not meet standards; returned to crew with instructions.'
  },
  REOPENED: {
    label: 'Reopened',
    badgeClass: 'bg-rose-500/10 text-rose-700 border border-rose-500/20',
    dotClass: 'bg-rose-600',
    icon: 'history_toggle_off',
    description: 'Issue reported as recurring or sub-standard by resident or auditor.'
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-error-container text-on-error-container border border-error/20',
    dotClass: 'bg-error',
    icon: 'cancel',
    description: 'Complaint rejected due to invalid jurisdiction, duplicate, or insufficient data.'
  }
};

export const PRIORITY_META = {
  CRITICAL: {
    label: 'P1 - Critical Hazard',
    badgeClass: 'bg-error-container text-on-error-container',
    icon: 'warning'
  },
  HIGH: {
    label: 'P2 - High Priority',
    badgeClass: 'bg-amber-500/10 text-amber-700',
    icon: 'priority_high'
  },
  MEDIUM: {
    label: 'P3 - Medium',
    badgeClass: 'bg-surface-container text-on-surface',
    icon: 'drag_handle'
  },
  LOW: {
    label: 'P4 - Low',
    badgeClass: 'bg-surface-container-low text-on-surface-variant',
    icon: 'low_priority'
  }
};

export const CATEGORIES = [
  { id: 'roads', name: 'Roads & Potholes', icon: 'add_road', dept: 'Public Works & Highways' },
  { id: 'lighting', name: 'Streetlights & Electrical', icon: 'lightbulb', dept: 'Municipal Energy & Lighting' },
  { id: 'water', name: 'Water & Sanitation Leakage', icon: 'water_drop', dept: 'Water Supply & Sewerage Board' },
  { id: 'waste', name: 'Solid Waste & Illegal Dumping', icon: 'delete_sweep', dept: 'Sanitation & Environment' },
  { id: 'traffic', name: 'Signals & Traffic Obstacles', icon: 'traffic', dept: 'Urban Mobility & Traffic' },
  { id: 'parks', name: 'Public Parks & Tree Hazards', icon: 'park', dept: 'Horticulture & Urban Forestry' }
];
