import { Box, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { BRAND } from '../theme.js';

export default function DialogHeader({ icon, title, subtitle, onClose, disabled }) {
  return (
    <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.5 }}>
      {icon && (
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
            display: 'grid', placeItems: 'center',
            color: BRAND.green, backgroundColor: BRAND.greenSoft,
            border: `1px solid ${BRAND.line}`,
            '& .MuiSvgIcon-root': { fontSize: 18 },
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="h6" component="h2" sx={{ lineHeight: 1.3 }}>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" component="p" color="text.secondary">{subtitle}</Typography>
        )}
      </Box>
      {onClose && (
        <IconButton onClick={onClose} disabled={disabled} size="small" aria-label="Close" sx={{ mr: -0.5, color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </DialogTitle>
  );
}
