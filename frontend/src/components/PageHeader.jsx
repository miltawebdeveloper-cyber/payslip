import { Box, Stack, Typography } from '@mui/material';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1.25, sm: 2 }}
      sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.78125rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' }, '& > *': { flex: { xs: 1, sm: 'none' } } }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
