const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function twoDigitsToWords(n) {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${TENS[tens]}${ones ? ' ' + ONES[ones] : ''}`;
}

function threeDigitsToWords(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(' ');
}

/**
 * Converts a non-negative integer into words using the Indian numbering
 * system (Thousand, Lakh, Crore).
 */
function integerToIndianWords(value) {
  let n = Math.floor(value);
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(' ');
}

/**
 * Converts a rupee amount (may include paise) into words, matching the
 * "<Words> Only" style used on the reference payslip.
 */
function amountToWords(amount) {
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);

  const rupeeWords = integerToIndianWords(rupees);

  if (paise > 0) {
    const paiseWords = twoDigitsToWords(paise);
    return `${rupeeWords} Rupees and ${paiseWords} Paise Only`;
  }

  return `${rupeeWords} Only`;
}

module.exports = { amountToWords };
