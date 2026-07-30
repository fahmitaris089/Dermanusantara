export function toNumber(value: bigint | number | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

export function formatIdr(value: bigint | number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}
