/**
 * Checks a drafted message against the rules in the provider's own material:
 * figures are illustrations only, loan terms depend on the customer and are
 * set by the lender, and past values guarantee nothing. A message should
 * invite a conversation, not quote numbers or promise results.
 */
export function checkMessage(text: string): string[] {
  const out: string[] = [];
  if (/\d\s?%|\bprozent\b|\bpercent\b/i.test(text))
    out.push("This message contains a percentage. Do not quote interest rates or returns in writing; they depend on the customer and can change.");
  if (/€\s?\d|\d\s?(€|eur\b|euro\b)/i.test(text))
    out.push("This message contains an amount in euros. Do not put savings, instalments or payouts in a message; give figures only in a personal consultation with the official documents.");
  if (/garant|guarantee|risikolos|risk[- ]free|ohne risiko|no risk|sichere[rs]? (rendite|gewinn|ertrag)|safe return/i.test(text))
    out.push("This message sounds like a promise. Nothing may be presented as guaranteed or free of risk.");
  return out;
}
