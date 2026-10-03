export const hasPermission = (admin, permission) => {
  if (String(admin?.role || '').toUpperCase() === 'ADMIN') return true;
  const permissions = [
    ...(Array.isArray(admin?.permissions) ? admin.permissions : []),
    ...(Array.isArray(admin?.customRole?.permissions) ? admin.customRole.permissions : []),
  ].map((value) => String(value || '').toLowerCase());
  return permissions.includes('*')
    || permissions.includes(permission)
    || permissions.some((value) => value.endsWith('.*') && permission.startsWith(`${value.slice(0, -2)}.`));
};

export const formatDateTime = (value) => (value
  ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—');

export const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');

export const lifecycleMeta = {
  AVAILABLE: { label: 'Available', color: 'success' },
  UNDER_REPAIR: { label: 'Under repair', color: 'warning' },
  DISPOSED: { label: 'Disposed', color: 'default' },
};

export const transferStatusMeta = {
  PENDING: { label: 'Pending receipt', color: 'warning' },
  RECEIVED: { label: 'Received', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
  CANCELLED: { label: 'Cancelled', color: 'default' },
};

export const eventMeta = {
  PURCHASED: { label: 'Purchased / added to inventory', color: 'primary' },
  UPDATED: { label: 'Details updated', color: 'default' },
  TRANSFER_REQUESTED: { label: 'Transfer initiated', color: 'info' },
  TRANSFER_RECEIVED: { label: 'Transfer received', color: 'success' },
  TRANSFER_REJECTED: { label: 'Transfer rejected', color: 'error' },
  TRANSFER_CANCELLED: { label: 'Transfer cancelled', color: 'default' },
  SPLIT: { label: 'Quantity split out', color: 'info' },
  SENT_FOR_REPAIR: { label: 'Sent for repair', color: 'warning' },
  RETURNED_FROM_REPAIR: { label: 'Returned from repair', color: 'success' },
  DISPOSED: { label: 'Disposed', color: 'error' },
};

// Cells starting with = + - @ are prefixed so spreadsheets don't run them as formulas.
const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const downloadCsv = (filename, headers, rows) => {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/^\ufeff/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      cell = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export const printAssetLabels = async (assets) => {
  const QRCode = (await import('qrcode')).default;
  const labels = await Promise.all(assets.map(async (asset) => ({
    ...asset,
    qr: await QRCode.toDataURL(asset.assetCode, { margin: 1, width: 220 }),
  })));
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) throw new Error('Allow pop-ups to print labels.');
  popup.document.write(`<!doctype html><html><head><title>Asset labels</title><style>
    body{font-family:Arial,sans-serif;margin:12px}
    .grid{display:flex;flex-wrap:wrap;gap:8px}
    .label{width:64mm;border:1px solid #000;padding:3mm;display:flex;gap:3mm;align-items:center;page-break-inside:avoid}
    .label img{width:24mm;height:24mm}
    .code{font-size:13pt;font-weight:700}
    .meta{font-size:8pt;line-height:1.3;word-break:break-word}
    @media print{body{margin:0}}
  </style></head><body><div class="grid">${labels.map((label) => `
    <div class="label"><img src="${label.qr}" alt="QR"/><div><div class="code">${escapeHtml(label.assetCode)}</div>
    <div class="meta">${escapeHtml(label.itemName)}<br/>${escapeHtml(label.centerName)}${label.serialNumber ? `<br/>S/N ${escapeHtml(label.serialNumber)}` : ''}</div></div></div>`).join('')}
  </div><script>window.onload=function(){window.print();}</script></body></html>`);
  popup.document.close();
};
