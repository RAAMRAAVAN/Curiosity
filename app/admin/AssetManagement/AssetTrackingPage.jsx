'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';
import Loader from '@/app/(components)/Loader';
import { useAdminAuth } from '../AdminAuthContext';
import { eventMeta, formatDate, formatDateTime, lifecycleMeta } from './assetUi';

function Detail({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
    </Box>
  );
}

function AssetTrackingContent() {
  const { admin, loading: authLoading } = useAdminAuth();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const lookup = async (params) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/asset-tracking?${params}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load asset journey.');
      setResult(data.data);
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && admin && initialQuery) lookup(new URLSearchParams({ q: initialQuery }));
  }, [authLoading, admin, initialQuery]);

  if (authLoading) return <Loader variant="page" size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  if (!admin) return null;

  const submit = (event) => {
    event.preventDefault();
    if (query.trim()) lookup(new URLSearchParams({ q: query.trim() }));
  };

  const asset = result?.asset;

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ color: '#0a336b', fontSize: { xs: 20, sm: 24 } }}>Asset Tracking</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Search by asset code, serial number or asset tag to see the complete journey of an asset.</Typography>

      <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap' }}>
        <TextField label="Asset code / Serial number" value={query} onChange={(event) => setQuery(event.target.value)} size="small" fullWidth sx={{ maxWidth: { xs: '100%', sm: 420 } }} />
        <Button type="submit" variant="contained" startIcon={<Search />} disabled={loading || !query.trim()} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' }, width: { xs: '100%', sm: 'auto' }, minHeight: 40 }}>Track</Button>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Loader variant="section" label="Loading journey..." sx={{ minHeight: 120 }} /> : null}

      {!loading && result?.matches?.length ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1 }}>Multiple assets match. Select one:</Typography>
          <Stack spacing={1}>
            {result.matches.map((match) => (
              <Button key={match.id} variant="outlined" onClick={() => lookup(new URLSearchParams({ id: match.id }))} sx={{ justifyContent: 'flex-start', textTransform: 'none', textAlign: 'left', overflowWrap: 'anywhere', minHeight: 40 }}>
                {match.assetCode} · {match.itemName} · {match.centerName}{match.serialNumber ? ` · S/N ${match.serialNumber}` : ''}
              </Button>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {!loading && asset ? (
        <>
          <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 2, mb: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#0a336b', overflowWrap: 'anywhere' }}>{asset.assetCode}</Typography>
              <Chip size="small" label={lifecycleMeta[asset.lifecycle]?.label || asset.lifecycle} color={lifecycleMeta[asset.lifecycle]?.color || 'default'} />
            </Stack>
            <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>
              <Detail label="Item" value={asset.itemMaster?.name} />
              <Detail label="Category" value={asset.itemMaster?.category?.name} />
              <Detail label="Serial number" value={asset.serialNumber} />
              <Detail label="Asset tag" value={asset.assetTag} />
              <Detail label="Current center" value={asset.center?.name} />
              <Detail label="Quantity" value={`${asset.quantity} ${asset.itemMaster?.unit || ''}`} />
              <Detail label="Condition" value={asset.condition} />
              <Detail label="Purchase date" value={asset.purchaseDate ? formatDate(asset.purchaseDate) : null} />
              <Detail label="Purchase cost" value={asset.purchaseCost == null ? null : String(asset.purchaseCost)} />
              <Detail label="Vendor" value={asset.vendor} />
              <Detail label="Invoice number" value={asset.invoiceNumber} />
              <Detail label="Warranty expiry" value={asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : null} />
            </Box>
          </Paper>

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: '#0a336b' }}>Journey</Typography>
          <Stack spacing={0}>
            {result.events.map((event) => {
              const meta = eventMeta[event.type] || { label: event.type, color: 'default' };
              const route = event.fromCenterName && event.toCenterName ? `${event.fromCenterName} → ${event.toCenterName}` : event.centerName;
              return (
                <Box key={event.id} sx={{ display: 'flex', gap: { xs: 1, sm: 2 } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, flexShrink: 0, borderRadius: '50%', bgcolor: '#0a336b', mt: 2 }} />
                    <Box sx={{ flex: 1, width: 2, bgcolor: 'divider' }} />
                  </Box>
                  <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 1.5, mb: 1.5, borderRadius: 2, overflowWrap: 'anywhere' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                      <Chip size="small" label={meta.label} color={meta.color} />
                      <Typography variant="caption" color="text.secondary">{formatDateTime(event.createdAt)}</Typography>
                    </Stack>
                    {route ? <Typography variant="body2" sx={{ mt: 0.75 }}>{route}{event.quantity ? ` · Qty ${event.quantity}` : ''}</Typography> : null}
                    {event.remarks ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{event.remarks}</Typography> : null}
                    {event.vendor || event.cost ? <Typography variant="body2" sx={{ mt: 0.5 }}>{[event.vendor ? `Vendor: ${event.vendor}` : null, event.cost ? `Cost: ${event.cost}` : null].filter(Boolean).join(' · ')}</Typography> : null}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {[event.performedByName ? `By ${event.performedByName}` : null, event.referenceNo ? `Ref ${event.referenceNo}` : null, event.assetCode !== asset.assetCode ? `Parent asset ${event.assetCode}` : null].filter(Boolean).join(' · ')}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
          </Stack>
        </>
      ) : null}
    </Box>
  );
}

export default function AssetTrackingPage() {
  return (
    <Suspense fallback={null}>
      <AssetTrackingContent />
    </Suspense>
  );
}
