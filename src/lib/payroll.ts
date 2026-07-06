// Công thức tính lương (rút gọn theo quy định Việt Nam, có thể tùy chỉnh):
// - Lương theo ngày công = Lương cơ bản / Ngày công chuẩn × (Ngày công thực tế + Ngày phép hưởng lương)
// - Tiền OT = Lương giờ × 1.5 × số giờ OT
// - Bảo hiểm bắt buộc (NLĐ đóng): 10.5% lương cơ bản (BHXH 8% + BHYT 1.5% + BHTN 1%)
// - Thuế TNCN: biểu lũy tiến, giảm trừ bản thân 11.000.000đ/tháng

const INSURANCE_RATE = 0.105;
const INSURANCE_CAP = 46_800_000; // Trần đóng BHXH (20 lần lương cơ sở)
const PERSONAL_DEDUCTION = 11_000_000;
const OT_MULTIPLIER = 1.5;
const HOURS_PER_DAY = 8;

/** Thuế TNCN lũy tiến từng phần trên thu nhập tính thuế/tháng */
export function calcPersonalIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  const brackets: Array<[number, number]> = [
    // [mức trần của bậc, thuế suất]
    [5_000_000, 0.05],
    [10_000_000, 0.1],
    [18_000_000, 0.15],
    [32_000_000, 0.2],
    [52_000_000, 0.25],
    [80_000_000, 0.3],
    [Infinity, 0.35],
  ];
  let tax = 0;
  let prevCap = 0;
  for (const [cap, rate] of brackets) {
    if (taxableIncome > prevCap) {
      tax += (Math.min(taxableIncome, cap) - prevCap) * rate;
      prevCap = cap;
    } else break;
  }
  return Math.round(tax);
}

export type PayslipInput = {
  baseSalary: number;
  allowance: number;
  standardDays: number;
  workDays: number;
  paidLeaveDays: number;
  otHours: number;
};

export type PayslipResult = {
  salaryByDays: number;
  otPay: number;
  grossPay: number;
  insuranceDeduction: number;
  taxDeduction: number;
  netPay: number;
};

export function calcPayslip(input: PayslipInput): PayslipResult {
  const { baseSalary, allowance, standardDays, workDays, paidLeaveDays, otHours } = input;
  const dailyRate = standardDays > 0 ? baseSalary / standardDays : 0;
  const hourlyRate = dailyRate / HOURS_PER_DAY;

  const paidDays = Math.min(workDays + paidLeaveDays, standardDays + 10); // chặn dữ liệu bất thường
  const salaryByDays = Math.round(dailyRate * paidDays);
  const otPay = Math.round(hourlyRate * OT_MULTIPLIER * otHours);
  // Phụ cấp trả theo tỷ lệ ngày công
  const allowancePaid = standardDays > 0
    ? Math.round((allowance * Math.min(paidDays, standardDays)) / standardDays)
    : allowance;

  const grossPay = salaryByDays + allowancePaid + otPay;
  const insuranceDeduction = Math.round(Math.min(baseSalary, INSURANCE_CAP) * INSURANCE_RATE);
  const taxable = grossPay - insuranceDeduction - PERSONAL_DEDUCTION;
  const taxDeduction = calcPersonalIncomeTax(taxable);
  const netPay = grossPay - insuranceDeduction - taxDeduction;

  return { salaryByDays, otPay, grossPay, insuranceDeduction, taxDeduction, netPay };
}
