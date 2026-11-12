import { createTheme, alpha } from '@mui/material/styles';

// Every colour in the UI is a shade of the logo's three inks: the forest green
// (#266929), the lime highlight (#9ABB3B) its gradients blend into, and the
// black wordmark. Neutrals are green-tinted greys so nothing reads as off-brand.
const BRAND = {
  greenDeep: '#0F2E12',
  greenDark: '#1B4D1E',
  green: '#266929',
  greenMid: '#4E8A31',
  lime: '#9ABB3B',
  limeDark: '#6B861E',
  limeLight: '#C9DC8E',
  limeSoft: '#F1F6E2',
  greenSoft: '#E9F2E7',
  greenWash: '#F5F9F2',
  ink: '#111712',
  inkSoft: '#57615A',
  inkMuted: '#8A938C',
  line: '#E2E7E0',
  lineSoft: '#EEF1EC',
  canvas: '#F6F8F4',
};

// Mirrors the logo mark's own vertical lime → green gradient.
const MARK_GRADIENT = `linear-gradient(180deg, ${BRAND.lime} 0%, ${BRAND.green} 100%)`;
const HERO_GRADIENT = `linear-gradient(140deg, ${BRAND.greenDeep} 0%, ${BRAND.greenDark} 45%, ${BRAND.green} 100%)`;

const HEADING_FONT = '"Plus Jakarta Sans", "Inter", "Segoe UI", system-ui, sans-serif';
const BODY_FONT = '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif';

const SHADOW = {
  xs: '0 1px 2px rgba(17, 23, 18, 0.05)',
  sm: '0 1px 2px rgba(17, 23, 18, 0.05), 0 1px 3px rgba(17, 23, 18, 0.04)',
  md: '0 4px 14px -4px rgba(15, 46, 18, 0.10), 0 2px 4px -2px rgba(17, 23, 18, 0.05)',
  lg: '0 14px 36px -10px rgba(15, 46, 18, 0.18), 0 4px 10px -4px rgba(17, 23, 18, 0.06)',
  xl: '0 28px 70px -18px rgba(15, 46, 18, 0.32)',
};

const base = createTheme();

// Compact density: 32px controls, 13px body text, ~32px table rows. Phones keep
// 16px input text so iOS doesn't zoom into a field on focus.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: BRAND.green,
      light: BRAND.greenMid,
      dark: BRAND.greenDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: BRAND.lime,
      light: BRAND.limeLight,
      dark: BRAND.limeDark,
      contrastText: BRAND.ink,
    },
    success: { main: BRAND.green, light: BRAND.greenMid, dark: BRAND.greenDark, contrastText: '#ffffff' },
    info: { main: BRAND.greenDark, light: BRAND.green, dark: BRAND.greenDeep, contrastText: '#ffffff' },
    warning: { main: BRAND.limeDark, light: BRAND.lime, dark: '#4F6414', contrastText: '#ffffff' },
    // Errors and destructive actions keep a muted red so they stay unmistakable.
    error: { main: '#B42318', light: '#D9534A', dark: '#8A1A12', contrastText: '#ffffff' },
    background: {
      default: BRAND.canvas,
      paper: '#ffffff',
    },
    text: {
      primary: BRAND.ink,
      secondary: BRAND.inkSoft,
      disabled: BRAND.inkMuted,
    },
    divider: BRAND.line,
    action: {
      hover: alpha(BRAND.green, 0.045),
      selected: alpha(BRAND.green, 0.09),
      focus: alpha(BRAND.green, 0.12),
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: base.shadows.map((_, i) => {
    if (i === 0) return 'none';
    if (i === 1) return SHADOW.sm;
    if (i <= 4) return SHADOW.md;
    if (i <= 12) return SHADOW.lg;
    return SHADOW.xl;
  }),
  typography: {
    fontFamily: BODY_FONT,
    h3: { fontFamily: HEADING_FONT, fontWeight: 800, letterSpacing: '-0.03em' },
    h4: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1.375rem', lineHeight: 1.25 },
    h5: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '-0.015em', fontSize: '1.125rem' },
    h6: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '-0.01em', fontSize: '0.9375rem', lineHeight: 1.35 },
    subtitle1: { fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.45 },
    subtitle2: { fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.4 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    overline: { fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.625rem', lineHeight: 1.6 },
    caption: { fontSize: '0.71875rem', lineHeight: 1.45 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0, fontSize: '0.8125rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        body: { backgroundColor: BRAND.canvas, fontFeatureSettings: '"cv11", "ss01"' },
        '::selection': { backgroundColor: BRAND.limeLight, color: BRAND.ink },
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: '#CBD3C8', borderRadius: 99, border: '2px solid transparent', backgroundClip: 'padding-box',
        },
        '*::-webkit-scrollbar-thumb:hover': { backgroundColor: '#AEB9AA' },
        '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: BRAND.line },
        rounded: { borderRadius: 12 },
      },
    },
    MuiSvgIcon: {
      styleOverrides: { fontSizeSmall: { fontSize: '1.125rem' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '5px 12px',
          minHeight: 32,
          lineHeight: 1.6,
          transition: 'background-color .18s ease, box-shadow .18s ease, border-color .18s ease',
          '& .MuiButton-startIcon': { marginRight: 6, marginLeft: -2 },
          '& .MuiButton-startIcon > *:nth-of-type(1)': { fontSize: 18 },
          variants: [
            {
              props: { variant: 'contained', color: 'primary' },
              style: {
                background: `linear-gradient(180deg, ${BRAND.green} 0%, ${BRAND.greenDark} 100%)`,
                boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.14)}, 0 1px 2px ${alpha(BRAND.greenDeep, 0.35)}`,
                '&:hover': {
                  background: `linear-gradient(180deg, ${BRAND.greenDark} 0%, ${BRAND.greenDeep} 100%)`,
                  boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.12)}, 0 6px 16px -6px ${alpha(BRAND.green, 0.6)}`,
                },
                '&.Mui-disabled': { background: BRAND.lineSoft, color: BRAND.inkMuted, boxShadow: 'none' },
              },
            },
            {
              props: { variant: 'outlined', color: 'primary' },
              style: {
                borderColor: BRAND.line,
                color: BRAND.ink,
                backgroundColor: '#ffffff',
                boxShadow: SHADOW.xs,
                '&:hover': { borderColor: BRAND.green, backgroundColor: BRAND.greenWash, color: BRAND.greenDark },
              },
            },
            { props: { size: 'large' }, style: { padding: '7px 16px', minHeight: 38, fontSize: '0.875rem', borderRadius: 10 } },
            { props: { size: 'small' }, style: { padding: '3px 10px', minHeight: 28, fontSize: '0.75rem' } },
          ],
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 6,
          borderRadius: 8,
          '&:hover': { backgroundColor: alpha(BRAND.green, 0.07) },
        },
        sizeSmall: { padding: 4 },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: '0.8125rem' },
        input: { [base.breakpoints.down('sm')]: { '&:not(.MuiSelect-select)': { fontSize: '1rem' } } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          transition: 'box-shadow .18s ease',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.line },
          '& .MuiOutlinedInput-notchedOutline legend': { fontSize: '0.85em' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#BFC9BC' },
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(BRAND.green, 0.12)}` },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.green, borderWidth: 1 },
          '&.Mui-disabled': { backgroundColor: BRAND.canvas },
        },
        // Only the vertical padding (and left padding when there's no adornment)
        // changes, so Select keeps the right padding its arrow needs.
        input: ({ ownerState }) => (ownerState.size === 'small'
          ? { paddingTop: 7, paddingBottom: 7, ...(!ownerState.startAdornment && { paddingLeft: 11 }) }
          : {}),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          fontSize: '0.8125rem',
          color: BRAND.inkSoft,
          '&.Mui-focused': { color: BRAND.green },
          ...(ownerState.variant === 'outlined' && ownerState.size === 'small' && {
            transform: 'translate(11px, 7.5px) scale(1)',
          }),
          ...(ownerState.variant === 'outlined' && ownerState.shrink && {
            transform: 'translate(14px, -7px) scale(0.85)',
            maxWidth: 'calc(117% - 32px)',
          }),
        }),
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 2, marginTop: 3, fontSize: '0.6875rem', color: BRAND.inkMuted } },
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: { color: BRAND.inkMuted, '& .MuiSvgIcon-root': { fontSize: 17 } },
        positionStart: { marginRight: 6 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
        sizeSmall: { height: 22, fontSize: '0.6875rem' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          color: BRAND.ink,
          backgroundColor: '#F4F7F1',
          borderBottom: `1px solid ${BRAND.line}`,
          whiteSpace: 'nowrap',
        },
        body: {
          fontSize: '0.8125rem',
          borderBottom: `1px solid ${BRAND.lineSoft}`,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        },
        sizeSmall: { padding: '6px 10px', '&.MuiTableCell-head': { paddingTop: 8, paddingBottom: 8 } },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        toolbar: { minHeight: 44 },
        selectLabel: { fontSize: '0.75rem', color: BRAND.inkSoft },
        displayedRows: { fontSize: '0.75rem', color: BRAND.inkSoft, fontVariantNumeric: 'tabular-nums' },
        input: { fontSize: '0.75rem' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 14, boxShadow: SHADOW.xl },
        paperFullScreen: { borderRadius: 0 },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: { variants: [{ props: { invisible: false }, style: { backgroundColor: alpha(BRAND.greenDeep, 0.42), backdropFilter: 'blur(3px)' } }] },
      },
    },
    MuiDialogContent: {
      styleOverrides: { dividers: { borderColor: BRAND.lineSoft } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { backgroundColor: BRAND.ink, fontSize: '0.6875rem', fontWeight: 500, borderRadius: 6, padding: '4px 8px' },
        arrow: { color: BRAND.ink },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 10, border: `1px solid ${BRAND.line}`, marginTop: 4 },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.8125rem',
          minHeight: 32,
          paddingTop: 4,
          paddingBottom: 4,
          '&.Mui-selected': { backgroundColor: BRAND.greenSoft, color: BRAND.greenDark, fontWeight: 600 },
          '&.Mui-selected:hover': { backgroundColor: '#DDEBDA' },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall': {
            paddingTop: 4,
            paddingBottom: 4,
            paddingLeft: 8,
            '& .MuiAutocomplete-input': { padding: '3px 4px 3px 2px' },
          },
        },
        paper: { borderRadius: 10, border: `1px solid ${BRAND.line}`, marginTop: 4, boxShadow: SHADOW.lg },
        listbox: {
          padding: 4,
          '& .MuiAutocomplete-option': { borderRadius: 6, minHeight: 34, paddingTop: 4, paddingBottom: 4 },
          '& .MuiAutocomplete-option[aria-selected="true"]': { backgroundColor: `${BRAND.greenSoft} !important` },
        },
        noOptions: { fontSize: '0.8125rem', padding: '10px 12px' },
        loading: { fontSize: '0.8125rem', padding: '10px 12px' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          alignItems: 'center',
          padding: '2px 12px',
          fontSize: '0.8125rem',
          variants: [
            { props: { variant: 'standard', severity: 'success' }, style: { backgroundColor: BRAND.greenSoft, color: BRAND.greenDark } },
            { props: { variant: 'standard', severity: 'info' }, style: { backgroundColor: BRAND.greenWash, color: BRAND.greenDark, border: `1px solid ${BRAND.greenSoft}` } },
            { props: { variant: 'standard', severity: 'warning' }, style: { backgroundColor: BRAND.limeSoft, color: '#3F5010' } },
            { props: { variant: 'standard', severity: 'error' }, style: { backgroundColor: '#FDF0EF', color: '#8A1A12' } },
            { props: { variant: 'filled', severity: 'success' }, style: { backgroundColor: BRAND.greenDark } },
            { props: { variant: 'filled' }, style: { boxShadow: SHADOW.lg, fontWeight: 500 } },
          ],
        },
        icon: { marginRight: 8, padding: '6px 0', fontSize: 18 },
        message: { padding: '6px 0' },
      },
    },
    MuiSkeleton: {
      styleOverrides: { root: { backgroundColor: alpha(BRAND.green, 0.07) } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, height: 4, backgroundColor: BRAND.greenSoft },
        bar: { borderRadius: 99, backgroundImage: `linear-gradient(90deg, ${BRAND.lime}, ${BRAND.green})` },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: BRAND.line } },
    },
    MuiAvatar: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
  },
});

export { BRAND, MARK_GRADIENT, HERO_GRADIENT, HEADING_FONT, SHADOW };

export default theme;
