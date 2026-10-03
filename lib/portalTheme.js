// Portal (admin / teacher / assessment) theme options layered over the base theme.
export const PORTAL_COLORS = {
  primary: '#0a336b',
  primaryDark: '#082b57',
  primaryLight: '#1d4f91',
  pageBackground: '#f5f8ff',
  surfaceTint: '#eef4fb',
  rowHover: '#f8fbff',
};

const portalThemeOptions = {
  palette: {
    primary: { main: PORTAL_COLORS.primary, dark: PORTAL_COLORS.primaryDark, light: PORTAL_COLORS.primaryLight, contrastText: '#ffffff' },
    background: { default: PORTAL_COLORS.pageBackground, paper: '#ffffff' },
  },
  components: {
    MuiTypography: {
      styleOverrides: { root: { overflowWrap: 'break-word' } },
    },
    MuiButton: {
      styleOverrides: {
        root: { maxWidth: '100%' },
        containedPrimary: { '&:hover': { backgroundColor: PORTAL_COLORS.primaryDark } },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          [theme.breakpoints.down('sm')]: {
            margin: 12,
            width: 'calc(100% - 24px)',
            maxWidth: 'calc(100% - 24px)',
            maxHeight: 'calc(100% - 24px)',
          },
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: PORTAL_COLORS.primary,
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '1.05rem',
          lineHeight: 1.4,
          padding: '14px 24px',
          overflowWrap: 'anywhere',
          [theme.breakpoints.down('sm')]: { padding: '12px 16px', fontSize: '1rem' },
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          '.MuiDialogTitle-root + &': { paddingTop: 20 },
          [theme.breakpoints.down('sm')]: { paddingLeft: 16, paddingRight: 16 },
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          flexWrap: 'wrap',
          gap: 8,
          padding: '12px 24px',
          [theme.breakpoints.down('sm')]: { padding: '12px 16px' },
          '& > :not(style) ~ :not(style)': { marginLeft: 0 },
        }),
      },
    },
    MuiTableContainer: {
      styleOverrides: { root: { maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down('sm')]: { padding: '8px 10px' },
        }),
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: ({ theme }) => ({
          maxWidth: '100%',
          overflowX: 'auto',
          [theme.breakpoints.down('sm')]: {
            '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', paddingLeft: 8, paddingRight: 8, rowGap: 4 },
            '& .MuiTablePagination-spacer': { display: 'none' },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { margin: 0 },
          },
        }),
      },
    },
    MuiFormControl: {
      styleOverrides: { root: { maxWidth: '100%' } },
    },
    MuiTextField: {
      styleOverrides: { root: { maxWidth: '100%' } },
    },
    MuiPopover: {
      styleOverrides: { paper: { maxWidth: 'calc(100vw - 24px)' } },
    },
    MuiAutocomplete: {
      styleOverrides: { paper: { maxWidth: 'calc(100vw - 24px)' }, listbox: { maxWidth: '100%' } },
    },
    MuiAlert: {
      styleOverrides: { message: { minWidth: 0, overflowWrap: 'anywhere' } },
    },
    MuiChip: {
      styleOverrides: { root: { maxWidth: '100%' } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { maxWidth: 'min(320px, calc(100vw - 24px))' } },
    },
  },
};

export default portalThemeOptions;
