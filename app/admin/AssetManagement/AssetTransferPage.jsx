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
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import Loader from '@/app/(components)/Loader';
import { useAdminAuth } from '../AdminAuthContext';
import { formatDateTime, hasPermission, transferStatusMeta } from './assetUi';
import usePagedData from '../usePagedData';

const emptyForm = { assetId: '', toCenterId: '', quantity: '1', remarks: '' };

export default function AssetTransferPage({ mode }) {
  const isReceive = mode === 'receive';
  const { admin, loading: authLoading } = useAdminAuth();
  const [options, setOptions] = useState({ centers: [], assets: [] });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [statusFilter, setStatusFilter] = useState(isReceive ? 'PENDING' : '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [action, setAction] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');

  const paged = usePagedData({
    endpoint: '/api/admin/asset-transfers',
    enabled: !authLoading && Boolean(admin),
    params: { direction: isReceive ? 'incoming' : 'outgoing', status: statusFilter },
  });
  const { rows, loading, search, setSearch } = paged;

  const canCreate = !isReceive && hasPermission(admin, 'asset_transfer.create');
  const canCancel = !isReceive && hasPermission(admin, 'asset_transfer.cancel');
  const canReceive = isReceive && hasPermission(admin, 'asset_receive.receive');
  const canReject = isReceive && hasPermission(admin, 'asset_receive.reject');

  const loadOptions = async () => {
    if (isReceive || !hasPermission(admin, 'asset_transfer.create')) return;
    try {
      const optionsResponse = await fetch('/api/admin/asset-transfers/options', { credentials: 'include' });
      const optionsResult = await optionsResponse.json();
      if (optionsResponse.ok && optionsResult.success) setOptions(optionsResult.data);
    } catch {
      // Options only feed the New Transfer dialog.
    }
  };

  const loadData = async () => {
    paged.reload();
    await loadOptions();
  };

  useEffect(() => {
    if (!authLoading && admin) loadOptions();
  }, [authLoading, admin, mode]);

  const selectedAsset = options.assets.find((asset) => asset.id === form.assetId);
  const destinationCenters = options.centers.filter((center) => center.id !== selectedAsset?.centerId);

  const submitTransfer = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/asset-transfers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to create transfer.');
      setDialogOpen(false);
      setFeedback({ severity: 'success', message: result.message });
      window.dispatchEvent(new Event('asset-transfers-changed'));
      await loadData();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const submitAction = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/asset-transfers/${encodeURIComponent(action.transfer.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.type, remarks: actionRemarks }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to update transfer.');
      setAction(null);
      setFeedback({ severity: 'success', message: result.message });
      window.dispatchEvent(new Event('asset-transfers-changed'));
      await loadData();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const openAction = (type, transfer) => {
    setActionRemarks('');
    setAction({ type, transfer });
  };

  if (authLoading) return <Loader variant="page" size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  if (!admin) return null;

  const filteredRows = rows;

  const actionLabels = { cancel: 'Cancel transfer', receive: 'Receive asset', reject: 'Reject transfer' };

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#0a336b', fontSize: { xs: 20, sm: 24 } }}>{isReceive ? 'Asset Receive' : 'Asset Transfer'}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {isReceive
              ? 'Receive assets sent to your center. Stock moves only after you receive them.'
              : 'Send assets to another center. Stock moves only after the receiving center accepts.'}
          </Typography>
        </Box>
        {canCreate ? <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setDialogOpen(true); }} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' }, width: { xs: '100%', sm: 'auto' }, minHeight: 40 }}>New Transfer</Button> : null}
      </Box>

      {feedback ? <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert> : null}
      {paged.error ? <Alert severity="error" sx={{ mb: 2 }}>{paged.error}</Alert> : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0} sx={{ mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <TextField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} size="small" fullWidth sx={{ maxWidth: { xs: '100%', sm: 420 } }} />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
          <InputLabel id="transfer-status-filter">Status</InputLabel>
          <Select labelId="transfer-status-filter" label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <MenuItem value="">All</MenuItem>
            {Object.entries(transferStatusMeta).map(([value, meta]) => <MenuItem key={value} value={value}>{meta.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: { xs: 560, md: 900 } }}>
          <TableHead sx={{ bgcolor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap' } }}>
            <TableRow>
              <TableCell>Transfer no.</TableCell>
              <TableCell>Asset</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Requested</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Remarks</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9}><Loader variant="section" label="Loading transfers..." sx={{ minHeight: 100 }} /></TableCell></TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>No transfers found.</TableCell></TableRow>
            ) : filteredRows.map((row) => {
              const meta = transferStatusMeta[row.status];
              return (
                <TableRow key={row.id} hover sx={{ '&.MuiTableRow-hover:hover': { bgcolor: '#f8fbff' } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.transferNo}</TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>
                    <Typography variant="body2" fontWeight={600}>{row.asset?.assetCode}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.asset?.itemMaster?.name}{row.asset?.serialNumber ? ` · S/N ${row.asset.serialNumber}` : ''}</Typography>
                  </TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>{row.fromCenterName}</TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>{row.toCenterName}</TableCell>
                  <TableCell>{row.quantity} {row.asset?.itemMaster?.unit || ''}</TableCell>
                  <TableCell><Chip size="small" label={meta?.label || row.status} color={meta?.color || 'default'} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>{formatDateTime(row.createdAt)}
                    <Typography variant="caption" display="block" color="text.secondary">by {row.requestedByName}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240, overflowWrap: 'anywhere', display: { xs: 'none', md: 'table-cell' } }}>
                    {row.remarks ? <Typography variant="body2">{row.remarks}</Typography> : null}
                    {row.responseRemarks ? <Typography variant="caption" color="text.secondary">{row.respondedByName}: {row.responseRemarks}</Typography> : null}
                    {!row.remarks && !row.responseRemarks ? '—' : null}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {row.status === 'PENDING' && canReceive ? <Button size="small" variant="contained" color="success" onClick={() => openAction('receive', row)} sx={{ mr: 1 }}>Receive</Button> : null}
                    {row.status === 'PENDING' && canReject ? <Button size="small" color="error" onClick={() => openAction('reject', row)}>Reject</Button> : null}
                    {row.status === 'PENDING' && canCancel ? <Button size="small" color="error" onClick={() => openAction('cancel', row)}>Cancel</Button> : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination {...paged.paginationProps} />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>New Asset Transfer</DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <FormControl size="small" fullWidth required>
              <InputLabel id="transfer-asset-label">Asset</InputLabel>
              <Select labelId="transfer-asset-label" label="Asset" value={form.assetId} onChange={(event) => setForm((current) => ({ ...current, assetId: event.target.value, toCenterId: '', quantity: '1' }))}>
                {options.assets.map((asset) => (
                  <MenuItem key={asset.id} value={asset.id}>
                    {asset.assetCode} · {asset.itemMaster?.name}{asset.serialNumber ? ` (${asset.serialNumber})` : ''} · {asset.center?.name} · {asset.available} available
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth required disabled={!selectedAsset}>
              <InputLabel id="transfer-center-label">Destination center</InputLabel>
              <Select labelId="transfer-center-label" label="Destination center" value={form.toCenterId} onChange={(event) => setForm((current) => ({ ...current, toCenterId: event.target.value }))}>
                {destinationCenters.map((center) => <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label={`Quantity${selectedAsset ? ` (max ${selectedAsset.available})` : ''}`}
              type="number"
              size="small"
              fullWidth
              required
              value={form.quantity}
              onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              inputProps={{ min: 1, max: selectedAsset?.available, step: 1 }}
            />
            <TextField label="Remarks" size="small" fullWidth multiline minRows={2} value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
            <Alert severity="info">Stock is reserved now and moves to the destination only after that center receives it.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={submitTransfer} disabled={saving || !form.assetId || !form.toCenterId || Number(form.quantity) < 1} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' } }}>{saving ? 'Sending...' : 'Send Transfer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(action)} onClose={() => !saving && setAction(null)} fullWidth maxWidth="xs" scroll="paper">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>{action ? actionLabels[action.type] : ''}</DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          {action ? (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Typography sx={{ overflowWrap: 'anywhere' }}>
                {action.transfer.quantity} × <strong>{action.transfer.asset?.itemMaster?.name}</strong> ({action.transfer.asset?.assetCode}) · {action.transfer.fromCenterName} → {action.transfer.toCenterName}
              </Typography>
              <TextField
                label={action.type === 'reject' ? 'Reason (required)' : 'Remarks (optional)'}
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={actionRemarks}
                onChange={(event) => setActionRemarks(event.target.value)}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAction(null)} disabled={saving}>Close</Button>
          <Button variant="contained" color={action?.type === 'receive' ? 'success' : 'error'} onClick={submitAction} disabled={saving || (action?.type === 'reject' && !actionRemarks.trim())}>
            {saving ? 'Working...' : action ? actionLabels[action.type] : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
