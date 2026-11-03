export const UAT_PERSONAS: Record<string, string> = {
  "UAT-01": "Henry", "UAT-02": "Henry", "UAT-03": "Henry",
  "UAT-04": "Diana", "UAT-05": "Diana", "UAT-06": "Diana",
  "UAT-07": "Henry", "UAT-08": "Grace", "UAT-09": "Henry",
  "UAT-10": "Henry", "UAT-11": "Henry",
}

export function demoPersona(email: string): string | null {
  const match = /^([a-z]+)@demo\.budgetbuddy\.test$/.exec(email)
  return match ? match[1].replace(/^./, c => c.toUpperCase()) : null
}

export function matchesUatPersona(taskId: string, email: string): boolean {
  return UAT_PERSONAS[taskId] === demoPersona(email)
}
