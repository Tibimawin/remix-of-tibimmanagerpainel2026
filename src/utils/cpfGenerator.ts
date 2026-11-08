export function generateValidCPF(): string {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  
  // 9 primeiros dígitos
  const n = Array.from({ length: 9 }, () => rnd(10));
  
  // 1º dígito verificador
  let d1 = n.reduce((total, num, idx) => total + num * (10 - idx), 0);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  
  // 2º dígito verificador
  let d2 = n.reduce((total, num, idx) => total + num * (11 - idx), 0) + d1 * 2;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  
  const allDigits = [...n, d1, d2];
  return `${allDigits.slice(0, 3).join('')}.${allDigits.slice(3, 6).join('')}.${allDigits.slice(6, 9).join('')}-${allDigits.slice(9).join('')}`;
}

export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}
