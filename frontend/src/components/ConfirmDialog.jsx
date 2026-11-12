import { Dialog, DialogContent, DialogActions, Button, Box, Typography, CircularProgress } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { BRAND } from '../theme.js';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', confirmColor = 'primary', loading }) {
  const destructive = confirmColor === 'error';

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogContent sx={{ pt: 2.5, pb: 0.5, px: 2.5, textAlign: 'center' }}>
        <Box
          sx={{
            width: 42, height: 42, mx: 'auto', mb: 1.5, borderRadius: '50%', display: 'grid', placeItems: 'center',
            ...(destructive
              ? { color: 'error.main', backgroundColor: '#FDF0EF', boxShadow: '0 0 0 6px #FEF7F6' }
              : { color: BRAND.green, backgroundColor: BRAND.greenSoft, boxShadow: `0 0 0 6px ${BRAND.greenWash}` }),
          }}
        >
          {destructive ? <DeleteOutlineRoundedIcon fontSize="small" /> : <HelpOutlineRoundedIcon fontSize="small" />}
        </Box>
        <Typography variant="h6" component="h2">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.78125rem' }}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pt: 2, pb: 2.25, gap: 1, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Button variant="outlined" fullWidth onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button
          onClick={onConfirm} color={confirmColor} variant="contained" fullWidth disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
