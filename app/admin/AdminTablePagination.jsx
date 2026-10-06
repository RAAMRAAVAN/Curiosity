'use client';

import { TablePagination } from '@mui/material';

export default function AdminTablePagination(props) {
  return (
    <TablePagination
      {...props}
      slotProps={{
        select: {
          variant: 'outlined',
          size: 'small',
          MenuProps: {
            disableScrollLock: true,
            anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
            transformOrigin: { vertical: 'top', horizontal: 'left' },
            PaperProps: {
              sx: {
                mt: 0.75,
                maxHeight: 280,
                minWidth: 88,
                border: '1px solid #d9e6f3',
                borderRadius: 1.5,
                boxShadow: '0 12px 28px rgba(8, 43, 87, 0.16)',
              },
            },
            MenuListProps: {
              dense: true,
              sx: {
                py: 0.5,
                '& .MuiMenuItem-root': {
                  minHeight: 38,
                  px: 1.5,
                  color: '#334155',
                  fontSize: 14,
                  '&:hover': { backgroundColor: '#edf5fc' },
                  '&.Mui-selected': {
                    backgroundColor: '#e5f0fb',
                    color: '#082b57',
                    fontWeight: 700,
                  },
                  '&.Mui-selected:hover': { backgroundColor: '#d9eafb' },
                },
              },
            },
          },
        },
      }}
      sx={{
        color: '#334155',
        backgroundColor: '#f3f8fe',
        borderTop: '1px solid #d9e6f3',
        '& .MuiTablePagination-toolbar': {
          minHeight: 60,
          px: { xs: 1, sm: 2 },
          flexWrap: 'wrap',
          justifyContent: { xs: 'space-between', sm: 'flex-end' },
          rowGap: 0.5,
        },
        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
          my: 0,
          color: '#52657a',
          fontSize: 13,
          fontWeight: 600,
        },
        '& .MuiTablePagination-selectLabel': {
          mr: 0.5,
        },
        '& .MuiTablePagination-select': {
          mr: { xs: 0.5, sm: 2 },
          borderRadius: 1,
          color: '#082b57',
          fontWeight: 700,
        },
        '& .MuiTablePagination-displayedRows': {
          ml: { xs: 0, sm: 1 },
        },
        '& .MuiTablePagination-actions': {
          display: 'flex',
          gap: 0.5,
          ml: { xs: 0.5, sm: 1.5 },
        },
        '& .MuiTablePagination-actions .MuiIconButton-root': {
          width: 34,
          height: 34,
          border: '1px solid #d5e2ef',
          borderRadius: 1.5,
          backgroundColor: '#ffffff',
          color: '#0a336b',
          '&:hover': { backgroundColor: '#e5f0fb' },
          '&.Mui-disabled': {
            borderColor: '#e3eaf1',
            color: '#b8c5d2',
          },
        },
      }}
    />
  );
}