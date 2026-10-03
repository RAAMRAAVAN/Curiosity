'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Build, Delete, Download, Edit, History, PlaylistAdd, QrCode2, TaskAlt, Block, UploadFile } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Loader from '@/app/(components)/Loader';
import { useAdminAuth } from '../AdminAuthContext';
import { downloadCsv, hasPermission, lifecycleMeta, parseCsv, printAssetLabels } from './assetUi';
import usePagedData, { fetchAllPages } from '../usePagedData';

const modeConfig = {
  categories: {
    title: 'Item Category Master',
    description: 'Maintain global categories used by item masters.',
    endpoint: '/api/admin/item-categories',
    permissionPrefix: 'asset_categories',
    addLabel: 'Add Category',
  },
  items: {
    title: 'Item Master',
    description: 'Maintain the global catalogue of items and their categories.',
    endpoint: '/api/admin/item-masters',
    permissionPrefix: 'asset_items',
    addLabel: 'Add Item',
  },
  assets: {
    title: 'Asset List',
    description: 'Track item quantities and asset details at each center.',
    endpoint: '/api/admin/asset-list',
    permissionPrefix: 'asset_list',
    addLabel: 'Add Asset',
  },
};

const conditions = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'NEEDS_REPAIR', label: 'Needs repair' },
  { value: 'DAMAGED', label: 'Damaged' },
];

const emptyForm = {
  name: '',
  codePrefix: '',
  description: '',
  categoryId: '',
  unit: 'unit',
  manufacturer: '',
  modelNumber: '',
  itemMasterId: '',
  centerId: '',
  quantity: '1',
  assetTag: '',
  serialNumber: '',
  condition: 'GOOD',
  location: '',
  purchaseDate: '',
  purchaseCost: '',
  vendor: '',
  invoiceNumber: '',
  warrantyExpiry: '',
  notes: '',
  status: true,
};

const emptyBulk = {
  itemMasterId: '',
  centerId: '',
  entry: 'serials',
  serials: '',
  count: '5',
  condition: 'GOOD',
  location: '',
  purchaseDate: '',
  purchaseCost: '',
  vendor: '',
  invoiceNumber: '',
  warrantyExpiry: '',
  notes: '',
};

const importHeaders = ['itemName', 'category', 'center', 'quantity', 'serialNumber', 'assetTag', 'condition', 'location', 'purchaseDate', 'purchaseCost', 'vendor', 'invoiceNumber', 'warrantyExpiry', 'notes'];

const normalizeCondition = (value) => {
  const key = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return key || 'GOOD';
};

const dateInputValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export default function AssetManagementPage({ mode }) {
  const { admin, loading: authLoading } = useAdminAuth();
  const config = modeConfig[mode];
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [centers, setCenters] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [centerFilter, setCenterFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const router = useRouter();
  const [lifecycleTarget, setLifecycleTarget] = useState(null);
  const [lifecycleRemarks, setLifecycleRemarks] = useState('');
  const [lifecycleCondition, setLifecycleCondition] = useState('GOOD');
  const [lifecycleQuantity, setLifecycleQuantity] = useState('');
  const [lifecycleVendor, setLifecycleVendor] = useState('');
  const [lifecycleCost, setLifecycleCost] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(emptyBulk);
  const [importPreview, setImportPreview] = useState(null);
  const [rowErrors, setRowErrors] = useState([]);

  const listParams = mode === 'assets' ? { centerId: centerFilter, condition: conditionFilter } : {};
  const paged = usePagedData({ endpoint: config.endpoint, enabled: !authLoading && Boolean(admin), params: listParams });
  const { rows, loading, search, setSearch } = paged;

  const canTrack = hasPermission(admin, 'asset_tracking.view');

  const canCreate = hasPermission(admin, `${config.permissionPrefix}.create`);
  const canEdit = hasPermission(admin, `${config.permissionPrefix}.edit`);
  const canDelete = hasPermission(admin, `${config.permissionPrefix}.delete`);

  const loadOptions = async () => {
    try {
      if (mode === 'items') {
        const categoryResponse = await fetch('/api/admin/item-categories', { credentials: 'include' });
        const categoryResult = await categoryResponse.json();
        if (!categoryResponse.ok || !categoryResult.success) throw new Error(categoryResult.message || 'Unable to load categories.');
        setCategories((categoryResult.data || []).filter((category) => category.status));
      }

      if (mode === 'assets') {
        const optionsResponse = await fetch('/api/admin/asset-list/options', { credentials: 'include' });
        const optionsResult = await optionsResponse.json();
        if (!optionsResponse.ok || !optionsResult.success) throw new Error(optionsResult.message || 'Unable to load asset options.');
        setCenters(optionsResult.data?.centers || []);
        setItems(optionsResult.data?.items || []);
      }
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || `Unable to load ${config.title.toLowerCase()}.` });
    }
  };

  const loadData = async () => {
    paged.reload();
    await loadOptions();
  };

  useEffect(() => {
    if (!authLoading && admin && config) loadOptions();
  }, [authLoading, admin, mode]);

  const openCreate = () => {
    const initialForm = { ...emptyForm };
    if (mode === 'items') initialForm.categoryId = categories[0]?.id || '';
    if (mode === 'assets') {
      initialForm.itemMasterId = items[0]?.id || '';
      initialForm.centerId = centers[0]?.id || '';
    }
    setEditing(null);
    setForm(initialForm);
    setFeedback(null);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFeedback(null);
    setForm({
      ...emptyForm,
      name: row.name || '',
      codePrefix: row.codePrefix || '',
      description: row.description || '',
      categoryId: row.categoryId || row.category?.id || '',
      unit: row.unit || 'unit',
      manufacturer: row.manufacturer || '',
      modelNumber: row.modelNumber || '',
      itemMasterId: row.itemMasterId || '',
      centerId: row.centerId || '',
      quantity: String(row.quantity ?? 1),
      assetTag: row.assetTag || '',
      serialNumber: row.serialNumber || '',
      condition: row.condition || 'GOOD',
      location: row.location || '',
      purchaseDate: dateInputValue(row.purchaseDate),
      purchaseCost: row.purchaseCost == null ? '' : String(row.purchaseCost),
      vendor: row.vendor || '',
      invoiceNumber: row.invoiceNumber || '',
      warrantyExpiry: dateInputValue(row.warrantyExpiry),
      notes: row.notes || '',
      status: row.status !== false,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const body = mode === 'categories'
      ? { name: form.name, codePrefix: form.codePrefix, description: form.description, status: form.status }
      : mode === 'items'
        ? { name: form.name, categoryId: form.categoryId, unit: form.unit, manufacturer: form.manufacturer, modelNumber: form.modelNumber, description: form.description, status: form.status }
        : { itemMasterId: form.itemMasterId, centerId: form.centerId, quantity: Number(form.quantity), assetTag: form.assetTag, serialNumber: form.serialNumber, condition: form.condition, location: form.location, purchaseDate: form.purchaseDate || null, purchaseCost: form.purchaseCost === '' ? null : Number(form.purchaseCost), vendor: form.vendor, invoiceNumber: form.invoiceNumber, warrantyExpiry: form.warrantyExpiry || null, notes: form.notes };

    try {
      setSaving(true);
      const response = await fetch(editing ? `${config.endpoint}/${encodeURIComponent(editing.id)}` : config.endpoint, {
        method: editing ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Unable to save ${config.title.toLowerCase()}.`);
      setDialogOpen(false);
      setFeedback({ severity: 'success', message: result.message || 'Saved successfully.' });
      await loadData();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save.' });
    } finally {
      setSaving(false);
    }
  };

  const openLifecycle = (type, row) => {
    setLifecycleRemarks('');
    setLifecycleCondition('GOOD');
    setLifecycleQuantity(String(row.quantity));
    setLifecycleVendor('');
    setLifecycleCost('');
    setLifecycleTarget({ type, row });
  };

  const submitLifecycle = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${config.endpoint}/${encodeURIComponent(lifecycleTarget.row.id)}/lifecycle`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: lifecycleTarget.type, remarks: lifecycleRemarks, condition: lifecycleCondition, quantity: lifecycleQuantity === '' ? undefined : Number(lifecycleQuantity), vendor: lifecycleVendor, cost: lifecycleCost === '' ? null : Number(lifecycleCost) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to update asset status.');
      setLifecycleTarget(null);
      setFeedback({ severity: 'success', message: result.message });
      await loadData();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const sendBulk = async (list) => {
    try {
      setSaving(true);
      setRowErrors([]);
      const response = await fetch('/api/admin/asset-list/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: list }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setRowErrors(result.errors?.errors || []);
        throw new Error(result.message || 'Unable to add assets.');
      }
      setBulkOpen(false);
      setImportPreview(null);
      setFeedback({ severity: 'success', message: result.message });
      await loadData();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const submitBulk = () => {
    const base = {
      itemMasterId: bulkForm.itemMasterId,
      centerId: bulkForm.centerId,
      condition: bulkForm.condition,
      location: bulkForm.location,
      purchaseDate: bulkForm.purchaseDate || null,
      purchaseCost: bulkForm.purchaseCost === '' ? null : Number(bulkForm.purchaseCost),
      vendor: bulkForm.vendor,
      invoiceNumber: bulkForm.invoiceNumber,
      warrantyExpiry: bulkForm.warrantyExpiry || null,
      notes: bulkForm.notes,
      quantity: 1,
    };
    const list = bulkForm.entry === 'serials'
      ? bulkForm.serials.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).map((serialNumber) => ({ ...base, serialNumber }))
      : Array.from({ length: Math.max(0, Math.min(500, Number(bulkForm.count) || 0)) }, () => ({ ...base }));
    if (!list.length) {
      setFeedback({ severity: 'error', message: 'Enter at least one serial number or a unit count.' });
      return;
    }
    sendBulk(list);
  };

  const exportCsv = async () => {
    try {
      const all = await fetchAllPages(config.endpoint, { search: search.trim(), ...listParams });
      downloadCsv(
        `assets-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Asset code', 'Item', 'Category', 'Center', 'Quantity', 'Unit', 'Serial number', 'Asset tag', 'Condition', 'Status', 'Location', 'Purchase date', 'Purchase cost', 'Vendor', 'Invoice number', 'Warranty expiry', 'Notes'],
        all.map((row) => [
          row.assetCode, row.itemMaster?.name, row.itemMaster?.category?.name, row.center?.name, row.quantity, row.itemMaster?.unit,
          row.serialNumber, row.assetTag, row.condition, lifecycleMeta[row.lifecycle]?.label || row.lifecycle, row.location,
          dateInputValue(row.purchaseDate), row.purchaseCost, row.vendor, row.invoiceNumber, dateInputValue(row.warrantyExpiry), row.notes,
        ]),
      );
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message });
    }
  };

  const printLabels = async (list) => {
    let source = list;
    if (!source) {
      try {
        source = await fetchAllPages(config.endpoint, { search: search.trim(), ...listParams }, { limit: 300 });
      } catch (error) {
        setFeedback({ severity: 'error', message: error.message });
        return;
      }
    }
    const targets = source.filter((row) => row.lifecycle !== 'DISPOSED').slice(0, 300);
    if (!targets.length) {
      setFeedback({ severity: 'error', message: 'There are no assets to print labels for.' });
      return;
    }
    try {
      await printAssetLabels(targets.map((row) => ({
        assetCode: row.assetCode,
        itemName: row.itemMaster?.name,
        centerName: row.center?.name,
        serialNumber: row.serialNumber,
      })));
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to print labels.' });
    }
  };

  const downloadTemplate = () => downloadCsv('asset-import-template.csv', importHeaders, [['Laptop', 'Electronics', centers[0]?.name || 'Center name', 1, 'SN-0001', '', 'Good', 'Lab 1', '2026-01-15', 25000, 'Vendor Ltd', 'INV-100', '2029-01-15', '']]);

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const table = parseCsv(await file.text());
    if (table.length < 2) {
      setFeedback({ severity: 'error', message: 'The file has no data rows.' });
      return;
    }
    const header = table[0].map((value) => value.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const pick = (cells, name) => (cells[header.indexOf(name.toLowerCase())] ?? '').trim();
    const importRows = [];
    const errors = [];
    table.slice(1).forEach((cells, index) => {
      const line = index + 2;
      const itemName = pick(cells, 'itemName');
      const categoryName = pick(cells, 'category').toLowerCase();
      const centerName = (pick(cells, 'center') || pick(cells, 'centre')).toLowerCase();
      const matches = items.filter((item) => item.name.toLowerCase() === itemName.toLowerCase() && (!categoryName || item.category?.name?.toLowerCase() === categoryName));
      const center = centers.find((entry) => entry.name.toLowerCase() === centerName);
      if (matches.length !== 1) { errors.push({ row: line, message: matches.length ? `Item "${itemName}" exists in several categories; add a category column.` : `Item "${itemName}" not found.` }); return; }
      if (!center) { errors.push({ row: line, message: `Center "${pick(cells, 'center')}" not found or not accessible.` }); return; }
      importRows.push({
        itemMasterId: matches[0].id,
        centerId: center.id,
        quantity: pick(cells, 'quantity') === '' ? 1 : Number(pick(cells, 'quantity')),
        serialNumber: pick(cells, 'serialNumber'),
        assetTag: pick(cells, 'assetTag'),
        condition: normalizeCondition(pick(cells, 'condition')),
        location: pick(cells, 'location'),
        purchaseDate: pick(cells, 'purchaseDate') || null,
        purchaseCost: pick(cells, 'purchaseCost'),
        vendor: pick(cells, 'vendor'),
        invoiceNumber: pick(cells, 'invoiceNumber'),
        warrantyExpiry: pick(cells, 'warrantyExpiry') || null,
        notes: pick(cells, 'notes'),
      });
    });
    setRowErrors([]);
    setImportPreview({ fileName: file.name, rows: importRows, errors });
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      const response = await fetch(`${config.endpoint}/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE', credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Unable to delete ${config.title.toLowerCase()}.`);
      setDeleteTarget(null);
      setFeedback({ severity: 'success', message: result.message || 'Deactivated successfully.' });
      await loadData();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to delete.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <Loader variant="page" size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  if (!admin) return null;

  const filteredRows = rows;

  const columns = mode === 'categories'
    ? [
        ['Category', (row) => row.name],
        ['Code prefix', (row) => row.codePrefix],
        ['Description', (row) => row.description || '—'],
        ['Items', (row) => row._count?.items ?? 0],
        ['Status', (row) => <Chip size="small" label={row.status ? 'Active' : 'Inactive'} color={row.status ? 'success' : 'default'} />],
      ]
    : mode === 'items'
      ? [
          ['Item', (row) => row.name],
          ['Category', (row) => row.category?.name || '—'],
          ['Unit', (row) => row.unit || '—'],
          ['Manufacturer / Model', (row) => [row.manufacturer, row.modelNumber].filter(Boolean).join(' / ') || '—'],
          ['Assets', (row) => row._count?.assets ?? 0],
          ['Status', (row) => <Chip size="small" label={row.status ? 'Active' : 'Inactive'} color={row.status ? 'success' : 'default'} />],
        ]
      : [
          ['Asset code', (row) => <Typography variant="body2" fontWeight={600}>{row.assetCode}</Typography>],
          ['Item', (row) => row.itemMaster?.name || '—'],
          ['Category', (row) => row.itemMaster?.category?.name || '—'],
          ['Center', (row) => row.center?.name || '—'],
          ['Quantity', (row) => `${row.quantity} ${row.itemMaster?.unit || ''}`.trim()],
          ['Asset tag / Serial', (row) => [row.assetTag, row.serialNumber].filter(Boolean).join(' / ') || '—'],
          ['Condition', (row) => conditions.find((item) => item.value === row.condition)?.label || row.condition],
          ['Status', (row) => <Chip size="small" label={lifecycleMeta[row.lifecycle]?.label || row.lifecycle} color={lifecycleMeta[row.lifecycle]?.color || 'default'} />],
          ['Location', (row) => row.location || '—'],
        ];

  const lowValueColumns = mode === 'assets' ? ['Category', 'Location', 'Asset tag / Serial'] : [];
  const hideOnXs = (label) => (lowValueColumns.includes(label) ? { display: { xs: 'none', md: 'table-cell' } } : {});
  const totalQuantity = paged.meta.totalQuantity || 0;
  const itemOptions = mode === 'assets' && editing?.itemMaster && !items.some((item) => item.id === editing.itemMasterId)
    ? [{ id: editing.itemMasterId, name: editing.itemMaster.name, category: editing.itemMaster.category }, ...items]
    : items;

  const renderField = (name, label, options = {}) => (
    <TextField
      key={name}
      label={label}
      value={form[name]}
      onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
      fullWidth
      size="small"
      multiline={options.multiline}
      minRows={options.multiline ? 2 : undefined}
      type={options.type || 'text'}
      required={options.required}
      inputProps={options.inputProps}
      InputLabelProps={options.InputLabelProps}
    />
  );

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#0a336b', fontSize: { xs: 20, sm: 24 } }}>{config.title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>{config.description}</Typography>
        </Box>
        {canCreate ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0} sx={{ flexWrap: 'wrap', gap: 1, '& > .MuiButton-root': { width: { xs: '100%', sm: 'auto' }, minHeight: 40 } }}>
            {mode === 'assets' ? <>
              <Button variant="outlined" startIcon={<PlaylistAdd />} onClick={() => { setBulkForm({ ...emptyBulk, itemMasterId: items[0]?.id || '', centerId: centers[0]?.id || '' }); setRowErrors([]); setBulkOpen(true); }}>Bulk Add</Button>
              <Button variant="outlined" component="label" startIcon={<UploadFile />}>Import CSV<input type="file" accept=".csv,text/csv" hidden onChange={handleImportFile} /></Button>
            </> : null}
            <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' } }}>{config.addLabel}</Button>
          </Stack>
        ) : null}
      </Box>

      {feedback ? <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert> : null}
      {paged.error ? <Alert severity="error" sx={{ mb: 2 }}>{paged.error}</Alert> : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0} sx={{ mb: 2, flexWrap: 'wrap', gap: 2, '& > .MuiButton-root': { width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 40, sm: 'auto' } } }} alignItems={{ sm: 'center' }}>
        <TextField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} size="small" fullWidth sx={{ maxWidth: { xs: '100%', sm: 420 } }} />
        {mode === 'assets' ? <>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
            <InputLabel id="asset-center-filter-label">Center</InputLabel>
            <Select labelId="asset-center-filter-label" label="Center" value={centerFilter} onChange={(event) => setCenterFilter(event.target.value)}>
              <MenuItem value="">All centers</MenuItem>
              {centers.map((center) => <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 }, width: { xs: '100%', sm: 'auto' } }}>
            <InputLabel id="asset-condition-filter-label">Condition</InputLabel>
            <Select labelId="asset-condition-filter-label" label="Condition" value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}>
              <MenuItem value="">All</MenuItem>
              {conditions.map((condition) => <MenuItem key={condition.value} value={condition.value}>{condition.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography color="text.secondary" sx={{ whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>{paged.total} records · Total quantity: <strong>{totalQuantity}</strong></Typography>
          <Button size="small" startIcon={<Download />} onClick={exportCsv} disabled={!paged.total}>Export CSV</Button>
          <Button size="small" startIcon={<QrCode2 />} onClick={() => printLabels()} disabled={!paged.total}>Print Labels</Button>
        </> : null}
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: { xs: 480, md: 760 } }}>
          <TableHead sx={{ bgcolor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap' } }}>
            <TableRow>
              {columns.map(([label]) => <TableCell key={label} sx={hideOnXs(label)}>{label}</TableCell>)}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length + 1}><Loader variant="section" label={`Loading ${config.title.toLowerCase()}...`} sx={{ minHeight: 100 }} /></TableCell></TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 1} align="center" sx={{ py: 5, color: 'text.secondary' }}>{search || centerFilter || conditionFilter ? 'No records match your search.' : 'No records yet.'}</TableCell></TableRow>
            ) : filteredRows.map((row) => (
              <TableRow key={row.id} hover sx={{ '&.MuiTableRow-hover:hover': { bgcolor: '#f8fbff' } }}>
                {columns.map(([label, render]) => <TableCell key={label} sx={{ overflowWrap: 'anywhere', ...hideOnXs(label) }}>{render(row)}</TableCell>)}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {mode === 'assets' && row.lifecycle !== 'DISPOSED' ? <Tooltip title="Print label" arrow><IconButton size="small" aria-label="Print asset label" onClick={() => printLabels([row])}><QrCode2 fontSize="small" /></IconButton></Tooltip> : null}
                  {mode === 'assets' && canTrack ? <Tooltip title="Journey" arrow><IconButton size="small" aria-label="View asset journey" onClick={() => router.push(`/admin/asset-management/tracking?q=${encodeURIComponent(row.assetCode)}`)}><History fontSize="small" /></IconButton></Tooltip> : null}
                  {mode === 'assets' && canEdit && row.lifecycle === 'AVAILABLE' ? <Tooltip title="Send for repair" arrow><IconButton size="small" aria-label="Send for repair" onClick={() => openLifecycle('send_for_repair', row)}><Build fontSize="small" /></IconButton></Tooltip> : null}
                  {mode === 'assets' && canEdit && row.lifecycle === 'UNDER_REPAIR' ? <Tooltip title="Return from repair" arrow><IconButton size="small" color="success" aria-label="Return from repair" onClick={() => openLifecycle('return_from_repair', row)}><TaskAlt fontSize="small" /></IconButton></Tooltip> : null}
                  {mode === 'assets' && canEdit && row.lifecycle !== 'DISPOSED' ? <Tooltip title="Dispose" arrow><IconButton size="small" color="error" aria-label="Dispose asset" onClick={() => openLifecycle('dispose', row)}><Block fontSize="small" /></IconButton></Tooltip> : null}
                  {canEdit && !(mode === 'assets' && row.lifecycle === 'DISPOSED') ? <Tooltip title="Edit" arrow><IconButton size="small" aria-label={`Edit ${config.title}`} onClick={() => openEdit(row)}><Edit fontSize="small" /></IconButton></Tooltip> : null}
                  {canDelete ? <Tooltip title="Delete" arrow><IconButton size="small" color="error" aria-label={`Delete ${config.title}`} onClick={() => setDeleteTarget(row)}><Delete fontSize="small" /></IconButton></Tooltip> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination {...paged.paginationProps} />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={false} scroll="paper">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>{editing ? `Edit ${config.title}` : config.addLabel}</DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {mode === 'categories' ? <>
              {renderField('name', 'Category name', { required: true })}
              {renderField('codePrefix', 'Asset code prefix (auto if blank, e.g. FUR)', { inputProps: { maxLength: 6 } })}
              {renderField('description', 'Description', { multiline: true })}
            </> : null}
            {mode === 'items' ? <>
              {renderField('name', 'Item name', { required: true })}
              <FormControl size="small" fullWidth required>
                <InputLabel id="asset-item-category-label">Category</InputLabel>
                <Select labelId="asset-item-category-label" label="Category" value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                  {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                </Select>
              </FormControl>
              {renderField('unit', 'Unit (e.g. piece, set)')}
              {renderField('manufacturer', 'Manufacturer')}
              {renderField('modelNumber', 'Model number')}
              {renderField('description', 'Description', { multiline: true })}
            </> : null}
            {mode === 'assets' ? <>
              <FormControl size="small" fullWidth required disabled={Boolean(editing)}>
                <InputLabel id="asset-item-label">Item</InputLabel>
                <Select labelId="asset-item-label" label="Item" value={form.itemMasterId} onChange={(event) => setForm((current) => ({ ...current, itemMasterId: event.target.value }))}>
                  {itemOptions.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.category?.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth required disabled={Boolean(editing)}>
                <InputLabel id="asset-center-label">Center</InputLabel>
                <Select labelId="asset-center-label" label="Center" value={form.centerId} onChange={(event) => setForm((current) => ({ ...current, centerId: event.target.value }))}>
                  {centers.map((center) => <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>)}
                </Select>
              </FormControl>
              {editing ? <Alert severity="info">To move this asset to another center, use Asset Transfer.</Alert> : <Alert severity="info">The asset code is generated automatically from the item category. Items with a serial number must have quantity 1.</Alert>}
              {renderField('quantity', 'Quantity', { type: 'number', required: true, inputProps: { min: 1, step: 1 } })}
              {renderField('assetTag', 'Asset tag')}
              {renderField('serialNumber', 'Serial number')}
              <FormControl size="small" fullWidth>
                <InputLabel id="asset-condition-label">Condition</InputLabel>
                <Select labelId="asset-condition-label" label="Condition" value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}>
                  {conditions.map((condition) => <MenuItem key={condition.value} value={condition.value}>{condition.label}</MenuItem>)}
                </Select>
              </FormControl>
              {renderField('location', 'Location')}
              {renderField('purchaseDate', 'Purchase date', { type: 'date', InputLabelProps: { shrink: true } })}
              {renderField('purchaseCost', 'Purchase cost', { type: 'number', inputProps: { min: 0, step: '0.01' } })}
              {renderField('vendor', 'Vendor / supplier')}
              {renderField('invoiceNumber', 'Invoice number')}
              {renderField('warrantyExpiry', 'Warranty expiry', { type: 'date', InputLabelProps: { shrink: true } })}
              {renderField('notes', 'Notes', { multiline: true })}
            </> : null}
            {mode !== 'assets' ? <FormControlLabel control={<Switch checked={Boolean(form.status)} onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))} />} label="Active" /> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || (mode === 'items' && categories.length === 0) || (mode === 'assets' && (!items.length || !centers.length))} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' } }}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkOpen} onClose={() => !saving && setBulkOpen(false)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>Bulk Add Assets</DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <FormControl size="small" fullWidth required>
              <InputLabel id="bulk-item-label">Item</InputLabel>
              <Select labelId="bulk-item-label" label="Item" value={bulkForm.itemMasterId} onChange={(event) => setBulkForm((current) => ({ ...current, itemMasterId: event.target.value }))}>
                {items.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.category?.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth required>
              <InputLabel id="bulk-center-label">Center</InputLabel>
              <Select labelId="bulk-center-label" label="Center" value={bulkForm.centerId} onChange={(event) => setBulkForm((current) => ({ ...current, centerId: event.target.value }))}>
                {centers.map((center) => <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel id="bulk-entry-label">Entry type</InputLabel>
              <Select labelId="bulk-entry-label" label="Entry type" value={bulkForm.entry} onChange={(event) => setBulkForm((current) => ({ ...current, entry: event.target.value }))}>
                <MenuItem value="serials">List of serial numbers (one asset per serial)</MenuItem>
                <MenuItem value="count">Number of units without serial (one asset each)</MenuItem>
              </Select>
            </FormControl>
            {bulkForm.entry === 'serials'
              ? <TextField label="Serial numbers (one per line)" size="small" fullWidth multiline minRows={4} value={bulkForm.serials} onChange={(event) => setBulkForm((current) => ({ ...current, serials: event.target.value }))} />
              : <TextField label="Number of units (max 500)" type="number" size="small" fullWidth value={bulkForm.count} onChange={(event) => setBulkForm((current) => ({ ...current, count: event.target.value }))} inputProps={{ min: 1, max: 500 }} />}
            <FormControl size="small" fullWidth>
              <InputLabel id="bulk-condition-label">Condition</InputLabel>
              <Select labelId="bulk-condition-label" label="Condition" value={bulkForm.condition} onChange={(event) => setBulkForm((current) => ({ ...current, condition: event.target.value }))}>
                {conditions.map((condition) => <MenuItem key={condition.value} value={condition.value}>{condition.label}</MenuItem>)}
              </Select>
            </FormControl>
            {[['location', 'Location'], ['purchaseDate', 'Purchase date', 'date'], ['purchaseCost', 'Purchase cost (per unit)', 'number'], ['vendor', 'Vendor / supplier'], ['invoiceNumber', 'Invoice number'], ['warrantyExpiry', 'Warranty expiry', 'date']].map(([name, label, type]) => (
              <TextField key={name} label={label} type={type || 'text'} size="small" fullWidth value={bulkForm[name]} onChange={(event) => setBulkForm((current) => ({ ...current, [name]: event.target.value }))} InputLabelProps={type === 'date' ? { shrink: true } : undefined} inputProps={type === 'number' ? { min: 0, step: '0.01' } : undefined} />
            ))}
            {rowErrors.length ? <Alert severity="error">{rowErrors.slice(0, 8).map((entry) => <div key={`${entry.row}-${entry.message}`}>Row {entry.row}: {entry.message}</div>)}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={submitBulk} disabled={saving || !bulkForm.itemMasterId || !bulkForm.centerId} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' } }}>{saving ? 'Adding...' : 'Add Assets'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(importPreview)} onClose={() => !saving && setImportPreview(null)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>Import CSV</DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography sx={{ overflowWrap: 'anywhere' }}><strong>{importPreview?.fileName}</strong>: {importPreview?.rows.length} row(s) ready, {importPreview?.errors.length} with problems.</Typography>
            {importPreview?.errors.length ? <Alert severity="error">{importPreview.errors.slice(0, 10).map((entry) => <div key={`${entry.row}-${entry.message}`}>Line {entry.row}: {entry.message}</div>)}</Alert> : null}
            {rowErrors.length ? <Alert severity="error">{rowErrors.slice(0, 10).map((entry) => <div key={`${entry.row}-${entry.message}`}>Row {entry.row}: {entry.message}</div>)}</Alert> : null}
            <Typography variant="body2" color="text.secondary">Columns: {importHeaders.join(', ')}. Everything is imported together or not at all.</Typography>
            <Button size="small" onClick={downloadTemplate} sx={{ alignSelf: 'flex-start' }}>Download template</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportPreview(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => sendBulk(importPreview.rows)} disabled={saving || !importPreview?.rows.length || importPreview?.errors.length > 0} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' } }}>{saving ? 'Importing...' : 'Import'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(lifecycleTarget)} onClose={() => !saving && setLifecycleTarget(null)} fullWidth maxWidth="xs" scroll="paper">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>
          {{ send_for_repair: 'Send for repair', return_from_repair: 'Return from repair', dispose: 'Dispose asset' }[lifecycleTarget?.type]}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography sx={{ overflowWrap: 'anywhere' }}><strong>{lifecycleTarget?.row?.assetCode}</strong> · {lifecycleTarget?.row?.itemMaster?.name}</Typography>
            {lifecycleTarget?.type === 'return_from_repair' ? (
              <FormControl size="small" fullWidth>
                <InputLabel id="lifecycle-condition-label">Condition after repair</InputLabel>
                <Select labelId="lifecycle-condition-label" label="Condition after repair" value={lifecycleCondition} onChange={(event) => setLifecycleCondition(event.target.value)}>
                  {conditions.map((condition) => <MenuItem key={condition.value} value={condition.value}>{condition.label}</MenuItem>)}
                </Select>
              </FormControl>
            ) : null}
            {lifecycleTarget?.type !== 'dispose' ? (
              <TextField label={lifecycleTarget?.type === 'send_for_repair' ? 'Repair vendor' : 'Repair vendor (optional)'} size="small" fullWidth value={lifecycleVendor} onChange={(event) => setLifecycleVendor(event.target.value)} />
            ) : null}
            {lifecycleTarget?.type !== 'dispose' ? (
              <TextField label={lifecycleTarget?.type === 'send_for_repair' ? 'Estimated repair cost' : 'Repair cost'} type="number" size="small" fullWidth value={lifecycleCost} onChange={(event) => setLifecycleCost(event.target.value)} inputProps={{ min: 0, step: '0.01' }} />
            ) : null}
            {lifecycleTarget?.type !== 'return_from_repair' && lifecycleTarget?.row?.quantity > 1 ? (
              <TextField label={`Quantity (of ${lifecycleTarget.row.quantity})`} type="number" size="small" fullWidth value={lifecycleQuantity} onChange={(event) => setLifecycleQuantity(event.target.value)} inputProps={{ min: 1, max: lifecycleTarget.row.quantity, step: 1 }} helperText="A smaller quantity is split into its own record with a new asset code." />
            ) : null}
            <TextField
              label={lifecycleTarget?.type === 'dispose' ? 'Reason for disposal (required)' : lifecycleTarget?.type === 'send_for_repair' ? 'Repair details / vendor' : 'Repair notes / cost'}
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={lifecycleRemarks}
              onChange={(event) => setLifecycleRemarks(event.target.value)}
            />
            {lifecycleTarget?.type === 'dispose' ? <Alert severity="warning">Disposal cannot be undone. The asset history is kept.</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLifecycleTarget(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" color={lifecycleTarget?.type === 'dispose' ? 'error' : 'primary'} onClick={submitLifecycle} disabled={saving || (lifecycleTarget?.type === 'dispose' && !lifecycleRemarks.trim())}>
            {saving ? 'Working...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>Deactivate record?</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ overflowWrap: 'anywhere' }}>Deactivate <strong>{deleteTarget?.name || deleteTarget?.itemMaster?.name || 'this record'}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Existing asset records are preserved.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove} disabled={saving}>{saving ? 'Working...' : 'Deactivate'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}