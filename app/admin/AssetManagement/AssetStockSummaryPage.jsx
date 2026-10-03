'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { Download } from '@mui/icons-material';
import Loader from '@/app/(components)/Loader';
import { useAdminAuth } from '../AdminAuthContext';
import { downloadCsv } from './assetUi';
import usePagedData, { fetchAllPages } from '../usePagedData';

const ENDPOINT = '/api/admin/asset-reports/stock';

const groupOptions = {
  center: 'Center',
  category: 'Category',
  item: 'Item',
  centerItem: 'Center + Item',
};

const money = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function AssetStockSummaryPage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const [groupBy, setGroupBy] = useState('center');
  const [centerFilter, setCenterFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [exportError, setExportError] = useState('');

  const params = { groupBy, centerId: centerFilter, categoryId: categoryFilter };
  const paged = usePagedData({ endpoint: ENDPOINT, enabled: !authLoading && Boolean(admin), params });
  const { rows, loading, search, setSearch } = paged;
  const totals = paged.meta.totals || { available: 0, underRepair: 0, inTransit: 0, disposed: 0, totalCost: 0 };
  const filterOptions = paged.meta.filterOptions || { centers: [], categories: [] };

  if (authLoading) return <Loader variant="page" size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  if (!admin) return null;

  const columns = [
    groupBy !== 'category' && groupBy !== 'item' ? ['Center', 'center'] : null,
    groupBy !== 'center' ? ['Category', 'category'] : null,
    groupBy === 'item' || groupBy === 'centerItem' ? ['Item', 'item'] : null,
  ].filter(Boolean);

  const exportCsv = async () => {
    try {
      setExportError('');
      const all = await fetchAllPages(ENDPOINT, { ...params, search: search.trim() });
      downloadCsv(
        `stock-summary-${new Date().toISOString().slice(0, 10)}.csv`,
        [...columns.map(([label]) => label), 'Available', 'Under repair', 'Pending transfer (reserved)', 'Disposed', 'Records', 'Total purchase cost'],
        all.map((row) => [...columns.map(([, field]) => row[field]), row.available, row.underRepair, row.inTransit, row.disposed, row.records, Number(row.totalCost).toFixed(2)]),
      );
    } catch (error) {
      setExportError(error.message);
    }
  };

  const cards = [
    ['Available', totals.available],
    ['Under repair', totals.underRepair],
    ['Pending transfer', totals.inTransit],
    ['Disposed', totals.disposed],
    ['Total purchase cost', money(totals.totalCost)],
  ];

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ color: '#0a336b', fontSize: { xs: 20, sm: 24 } }}>Stock Summary</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Asset quantities by center, category and item. Pending transfer units are still counted in Available until received.</Typography>

      {paged.error ? <Alert severity="error" sx={{ mb: 2 }}>{paged.error}</Alert> : null}
      {exportError ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError('')}>{exportError}</Alert> : null}

      <Box sx={{ display: 'grid', gap: 2, mb: 3, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fit, minmax(160px, 1fr))' } }}>
        {cards.map(([label, value]) => (
          <Paper key={label} variant="outlined" sx={{ p: 2, minWidth: 0, borderRadius: 2, bgcolor: '#eef4fb' }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#0a336b', overflowWrap: 'anywhere' }}>{value}</Typography>
          </Paper>
        ))}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0} sx={{ mb: 2, flexWrap: 'wrap', gap: 2, '& > .MuiButton-root': { width: { xs: '100%', sm: 'auto' }, minHeight: { xs: 40, sm: 'auto' } } }} alignItems={{ sm: 'center' }}>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
          <InputLabel id="stock-group-label">Group by</InputLabel>
          <Select labelId="stock-group-label" label="Group by" value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
            {Object.entries(groupOptions).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
          <InputLabel id="stock-center-label">Center</InputLabel>
          <Select labelId="stock-center-label" label="Center" value={centerFilter} onChange={(event) => setCenterFilter(event.target.value)}>
            <MenuItem value="">All centers</MenuItem>
            {filterOptions.centers.map((center) => <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
          <InputLabel id="stock-category-label">Category</InputLabel>
          <Select labelId="stock-category-label" label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <MenuItem value="">All categories</MenuItem>
            {filterOptions.categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Search" size="small" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ width: { xs: '100%', sm: 'auto' } }} />
        <Button startIcon={<Download />} onClick={exportCsv} disabled={!paged.total}>Export CSV</Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: { xs: 480, md: 700 } }}>
          <TableHead sx={{ bgcolor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap' } }}>
            <TableRow>
              {columns.map(([label]) => <TableCell key={label}>{label}</TableCell>)}
              <TableCell align="right">Available</TableCell>
              <TableCell align="right">Under repair</TableCell>
              <TableCell align="right">Pending transfer</TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Disposed</TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Records</TableCell>
              <TableCell align="right">Purchase cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length + 6}><Loader variant="section" label="Loading stock summary..." sx={{ minHeight: 100 }} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 6} align="center" sx={{ py: 5, color: 'text.secondary' }}>No stock found.</TableCell></TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.key} hover sx={{ '&.MuiTableRow-hover:hover': { bgcolor: '#f8fbff' } }}>
                {columns.map(([label, field]) => <TableCell key={label} sx={{ overflowWrap: 'anywhere' }}>{row[field] || '—'}</TableCell>)}
                <TableCell align="right">{row.available}</TableCell>
                <TableCell align="right">{row.underRepair}</TableCell>
                <TableCell align="right">{row.inTransit}</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{row.disposed}</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{row.records}</TableCell>
                <TableCell align="right">{money(row.totalCost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination {...paged.paginationProps} />
    </Box>
  );
}
