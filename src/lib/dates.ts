export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDate(days: number, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return localDate(new Date(y, m - 1 + delta, 1)).slice(0, 7);
}
export function dateLabel(date: string) {
  if (date === localDate()) return "今天";
  if (date === shiftDate(-1)) return "昨天";
  return new Date(date + "T12:00:00").toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}
export function cents(amount: string | number) {
  return Math.round(Number(amount) * 100);
}
export function money(value: number) {
  return (value / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
