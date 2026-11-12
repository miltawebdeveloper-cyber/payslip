import { useState } from 'react';
import { Box, Button, Checkbox, ListSubheader, Menu, MenuItem, Typography } from '@mui/material';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { COLUMN_GROUPS, HIDEABLE_COLUMNS } from './salaryColumns.js';
import { BRAND } from '../theme.js';

const SUBHEADER_SX = {
  lineHeight: '28px', fontSize: '0.6875rem', fontWeight: 700, color: BRAND.inkMuted, px: 1.25, backgroundColor: '#fff',
};

export default function ColumnVisibilityMenu({ hidden, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const toggle = (key) => {
    onChange(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ViewColumnOutlinedIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-haspopup="true"
        aria-expanded={Boolean(anchorEl)}
      >
        Columns
        {hidden.length > 0 && (
          <Box
            component="span"
            sx={{ ml: 0.75, px: 0.75, borderRadius: 99, fontSize: '0.6875rem', lineHeight: 1.6, backgroundColor: BRAND.greenSoft, color: BRAND.greenDark }}
          >
            {hidden.length} hidden
          </Box>
        )}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 240, maxHeight: 440 } } }}
      >
        <ListSubheader sx={{ ...SUBHEADER_SX, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: BRAND.ink, fontSize: '0.75rem' }}>
          Show columns
          <Button size="small" onClick={() => onChange([])} disabled={hidden.length === 0} sx={{ minHeight: 0, py: 0.25 }}>
            Show all
          </Button>
        </ListSubheader>
        {COLUMN_GROUPS.filter((group) => group.key !== 'employee').map((group) => [
          <ListSubheader key={group.key} sx={SUBHEADER_SX}>{group.label}</ListSubheader>,
          ...HIDEABLE_COLUMNS.filter((col) => col.group === group.key).map((col) => (
            <MenuItem key={col.key} onClick={() => toggle(col.key)} sx={{ minHeight: 30, py: 0, pl: 0.5 }}>
              <Checkbox size="small" checked={!hidden.includes(col.key)} disableRipple tabIndex={-1} sx={{ p: 0.5, mr: 0.5 }} />
              {col.label}
            </MenuItem>
          )),
        ])}
        <Typography variant="caption" component="li" sx={{ display: 'block', px: 1.25, pt: 0.75, pb: 0.5, color: BRAND.inkMuted }}>
          Employee ID and Name are always shown.
        </Typography>
      </Menu>
    </>
  );
}
