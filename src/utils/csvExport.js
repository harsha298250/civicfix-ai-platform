/**
 * RFC 4180 compliant CSV cell formatting and escaping utility.
 * Includes defensive mitigation against CSV formula injection.
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Neutralize CSV formula injection if string starts with formula operators
  if (/^[=+@\-\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If cell contains quotes, commas, or newlines, quote and double up internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of audit log objects into a formatted CSV string with UTF-8 BOM.
 */
export function formatAuditLogsToCsv(logs = []) {
  const headers = [
    'Timestamp',
    'Event ID',
    'Actor Name',
    'Actor Role',
    'Actor ID',
    'Action',
    'Target Type',
    'Target ID',
    'Status',
    'IP Address',
    'Details'
  ];

  const headerRow = headers.map(escapeCsvCell).join(',');

  const dataRows = (logs || []).map((log) => {
    const row = [
      log.createdAt || '',
      log.id || '',
      log.actorName || '',
      log.actorRole || '',
      log.actorId || '',
      log.action || '',
      log.targetType || '',
      log.targetId || '',
      log.status || '',
      log.ipAddress || '',
      log.details || ''
    ];
    return row.map(escapeCsvCell).join(',');
  });

  // UTF-8 Byte Order Mark (\uFEFF) ensures Excel and text editors properly render Unicode characters
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers a client-side download of audit logs as a CSV file.
 */
export function downloadAuditLogsCsv(logs, filename = `platform_activity_audit_${new Date().toISOString().slice(0, 10)}.csv`) {
  const csvContent = formatAuditLogsToCsv(logs);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

