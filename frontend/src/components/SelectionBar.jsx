import { Box, Button, Link, Skeleton, Stack, Typography } from '@mui/material';
import CheckBoxRoundedIcon from '@mui/icons-material/CheckBoxRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { formatCurrency } from '../utils/format.js';
import { BRAND } from '../theme.js';

function Stat({ label, value, loading, strong }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5, whiteSpace: 'nowrap' }}>
      <Box component="span" sx={{ color: BRAND.inkSoft, fontSize: '0.75rem' }}>{label}</Box>
      {loading ? (
        <Skeleton width={64} sx={{ display: 'inline-block' }} />
      ) : (
        <Box
          component="span"
          sx={{ fontWeight: strong ? 700 : 600, fontSize: '0.8125rem', color: strong ? BRAND.greenDark : BRAND.ink, fontVariantNumeric: 'tabular-nums' }}
        >
          ₹ {formatCurrency(value)}
        </Box>
      )}
    </Box>
  );
}

/**
 * Shown above the salary table while rows are ticked: how many are selected,
 * their combined pay totals (calculated by the backend), and the bulk actions.
 * Also offers the step up from "this page" to "every matching record".
 */
export default function SelectionBar({
  count, summary, loading, allMatching, canSelectAllMatching, pageCount, total,
  onSelectAllMatching, onClear, onDelete,
}) {
  const shownCount = summary ? summary.count : count;

  return (
    <Box sx={{ borderBottom: `1px solid ${BRAND.line}`, backgroundColor: BRAND.greenWash }}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 2, rowGap: 0.75, px: { xs: 1, sm: 1.5 }, py: 0.75 }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <CheckBoxRoundedIcon sx={{ fontSize: 18, color: BRAND.green }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: BRAND.greenDark, whiteSpace: 'nowrap' }}>
            {shownCount.toLocaleString('en-IN')} selected
          </Typography>
          {summary && summary.employees !== summary.count && (
            <Typography variant="caption" sx={{ color: BRAND.inkSoft, whiteSpace: 'nowrap' }}>
              · {summary.employees} {summary.employees === 1 ? 'employee' : 'employees'}
            </Typography>
          )}
        </Stack>

        <Stat label="Gross earnings" value={summary?.grossEarnings} loading={loading || !summary} />
        <Stat label="Deductions" value={summary?.grossDeductions} loading={loading || !summary} />
        <Stat label="Net pay" value={summary?.netPay} loading={loading || !summary} strong />

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={onClear} sx={{ color: 'text.secondary' }}>Clear</Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={onDelete}
          >
            Delete {shownCount.toLocaleString('en-IN')}
          </Button>
        </Stack>
      </Stack>

      {(canSelectAllMatching || allMatching) && (
        <Typography
          variant="caption"
          component="div"
          sx={{ textAlign: 'center', py: 0.5, px: 1, borderTop: `1px solid ${BRAND.greenSoft}`, color: BRAND.inkSoft }}
        >
          {allMatching ? (
            <>
              All <b>{total.toLocaleString('en-IN')}</b> matching records are selected.{' '}
              <Link component="button" type="button" onClick={onClear} sx={{ fontWeight: 600, verticalAlign: 'baseline' }}>
                Clear selection
              </Link>
            </>
          ) : (
            <>
              All {pageCount} records on this page are selected.{' '}
              <Link component="button" type="button" onClick={onSelectAllMatching} sx={{ fontWeight: 600, verticalAlign: 'baseline' }}>
                Select all {total.toLocaleString('en-IN')} matching records
              </Link>
            </>
          )}
        </Typography>
      )}
    </Box>
  );
}
