export const INPUT_LIMITS = {
  age: 120,
  bodyWeightKg: 650,
  bodyWeightLb: 1433,
  calories: 20_000,
  emailLength: 254,
  foodGrams: 100_000,
  foodServings: 1_000,
  heightCm: 300,
  heightFeet: 9,
  heightInches: 11.9,
  liftKg: 2268,
  liftLb: 5_000,
  macroGrams: 5_000,
  passwordLength: 128,
  searchLength: 120,
  verificationCode: 999_999,
} as const;

export function sanitizeNumericInput(input: string, max: number, decimals = 1): string | null {
  let next = input.replace(/,/g, '.').replace(/[^\d.]/g, '');
  if (!decimals) next = next.replace(/\./g, '');
  else {
    const [whole = '', ...fraction] = next.split('.');
    next = fraction.length ? `${whole || '0'}.${fraction.join('').slice(0, decimals)}` : whole;
  }
  return !next || Number(next) <= max ? next : null;
}
