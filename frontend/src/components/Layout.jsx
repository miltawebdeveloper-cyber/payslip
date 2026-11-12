import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, Typography, IconButton, Tooltip, AppBar, Toolbar,
  useMediaQuery, Stack,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import logoUrl from '../assets/logo.svg';
import BrandMark from './BrandMark.jsx';
import { BRAND, MARK_GRADIENT } from '../theme.js';

const DRAWER_WIDTH = 216;
const MINI_WIDTH = 60;
const COLLAPSE_KEY = 'payslip.sidebarCollapsed';

const NAV_ITEMS = [
  { path: '/salary-data', label: 'Salary Data', icon: <TableChartOutlinedIcon sx={{ fontSize: 17 }} /> },
  { path: '/payslip-generator', label: 'Payslip Generator', icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 17 }} /> },
];

const TODAY = new Date().toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function NavItem({ item, mini, onNavigate }) {
  const button = (
    <ListItemButton
      component={NavLink}
      to={item.path}
      onClick={onNavigate}
      sx={{
        borderRadius: '8px',
        mb: 0.25,
        px: mini ? 0 : 0.75,
        py: 0.625,
        gap: 1.25,
        justifyContent: mini ? 'center' : 'flex-start',
        border: '1px solid transparent',
        color: BRAND.inkSoft,
        transition: 'background-color .18s ease, border-color .18s ease, color .18s ease',
        '& .nav-icon': {
          width: 28, height: 28, borderRadius: '7px', display: 'grid', placeItems: 'center', flexShrink: 0,
          color: BRAND.inkSoft, backgroundColor: BRAND.canvas, border: `1px solid ${BRAND.lineSoft}`,
          transition: 'all .18s ease',
        },
        '&:hover': { backgroundColor: BRAND.greenWash, color: BRAND.ink },
        '&:hover .nav-icon': { color: BRAND.green },
        '&.active': {
          backgroundColor: BRAND.greenWash,
          borderColor: BRAND.greenSoft,
          color: BRAND.greenDark,
        },
        '&.active .nav-icon': {
          color: '#fff',
          background: MARK_GRADIENT,
          borderColor: 'transparent',
          boxShadow: `0 4px 10px -4px ${alpha(BRAND.green, 0.7)}`,
        },
      }}
    >
      <Box className="nav-icon">{item.icon}</Box>
      {!mini && (
        <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'inherit' }}>
          {item.label}
        </Typography>
      )}
    </ListItemButton>
  );

  return mini ? <Tooltip title={item.label} placement="right">{button}</Tooltip> : button;
}

function SidebarContent({ mini, onNavigate }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>
      <Box
        sx={{
          height: 56, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: mini ? 'center' : 'flex-start', px: mini ? 0 : 2,
        }}
      >
        {mini ? (
          <BrandMark size={30} />
        ) : (
          <Box component="img" src={logoUrl} alt="Milta Accounting Services" sx={{ height: 38, width: 'auto', display: 'block' }} />
        )}
      </Box>

      <Box sx={{ px: mini ? 1 : 1.25, pt: 1 }}>
        {!mini && (
          <Typography variant="overline" sx={{ color: BRAND.inkMuted, px: 0.75, display: 'block', mb: 0.5 }}>
            Payroll
          </Typography>
        )}
        <List disablePadding>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.path} item={item} mini={mini} onNavigate={onNavigate} />
          ))}
        </List>
      </Box>
    </Box>
  );
}

export default function Layout() {
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentItem = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path));
  const sidebarWidth = collapsed ? MINI_WIDTH : DRAWER_WIDTH;

  const toggleSidebar = () => {
    if (!isDesktop) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // Storage can be unavailable (private mode); the toggle still works for this session.
      }
      return next;
    });
  };

  const paperSx = {
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    borderRight: `1px solid ${BRAND.line}`,
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      {isDesktop ? (
        <Box
          component="nav"
          sx={{ width: sidebarWidth, flexShrink: 0, transition: 'width .22s ease' }}
        >
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': { ...paperSx, width: sidebarWidth, transition: 'width .22s ease' },
            }}
          >
            <SidebarContent mini={collapsed} />
          </Drawer>
        </Box>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { ...paperSx, width: DRAWER_WIDTH + 24, borderRight: 'none' } }}
        >
          <SidebarContent mini={false} onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            backgroundColor: alpha('#ffffff', 0.82),
            backdropFilter: 'saturate(180%) blur(14px)',
            borderBottom: `1px solid ${BRAND.line}`,
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 48, md: 52 }, gap: 1, px: { xs: 1, sm: 2, md: 2.5 } }}>
            <Tooltip title={isDesktop ? (collapsed ? 'Expand sidebar' : 'Collapse sidebar') : 'Open menu'}>
              <IconButton
                onClick={toggleSidebar}
                aria-label={isDesktop ? 'Toggle sidebar' : 'Open navigation menu'}
                sx={{ border: `1px solid ${BRAND.line}`, backgroundColor: '#fff', width: 32, height: 32 }}
              >
                {isDesktop && !collapsed ? <MenuOpenRoundedIcon fontSize="small" /> : <MenuRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {!isDesktop && (
              <Box component="img" src={logoUrl} alt="Milta Accounting Services" sx={{ height: 28, width: 'auto', display: 'block' }} />
            )}

            {isDesktop && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ml: 0.5 }}>
                <Typography variant="body2" sx={{ color: BRAND.inkMuted, fontWeight: 500 }}>Payroll</Typography>
                <ChevronRightRoundedIcon sx={{ fontSize: 16, color: BRAND.inkMuted }} />
                <Typography variant="body2" sx={{ color: BRAND.ink, fontWeight: 600 }}>
                  {currentItem ? currentItem.label : 'Payslip Generator'}
                </Typography>
              </Stack>
            )}

            <Box sx={{ flexGrow: 1 }} />

            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                display: { xs: 'none', sm: 'flex' }, alignItems: 'center',
                px: 1.25, py: 0.5, borderRadius: 99, border: `1px solid ${BRAND.line}`, backgroundColor: '#fff',
              }}
            >
              <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: BRAND.green }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: BRAND.inkSoft }}>{TODAY}</Typography>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1, width: '100%', maxWidth: 1600, mx: 'auto', minWidth: 0,
            px: { xs: 1.5, sm: 2, md: 2.5 }, pt: { xs: 1.5, md: 2 }, pb: { xs: 2, md: 2.5 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
