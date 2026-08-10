export function calcCost(normalMins: number, otMins: number, hourlyRate: number | null | undefined, otRate: number | null | undefined) {
  const normalCost = hourlyRate ? (normalMins / 60) * hourlyRate : 0
  const otCost = otRate ? (otMins / 60) * otRate : 0
  return { normalCost, otCost, totalCost: normalCost + otCost }
}

export function formatCurrency(value: number) {
  return `RM ${value.toFixed(2)}`
}
