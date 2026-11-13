import type { Product } from "./types";

/**
 * What the system knows about the products and the rules for talking about
 * them. Entries are written from material the representative provided; each
 * names its source. The source documents themselves are not stored here, and
 * their wording and example figures are deliberately not copied.
 */
export interface Guide {
  title: string;
  summary: string;
  fits: string[];
  ask: string[];
  say: string[];
  never: string[];
  source: string;
}

export const GUIDES: Partial<Record<Product, Guide>> = {
  "Home financing": {
    title: "Home financing and refinancing",
    summary: "Help with paying for a home: a new loan for buying or building, or moving an existing home loan to better terms. The adviser collects offers from several lenders, explains the differences, and the customer decides.",
    fits: [
      "Tenants who want to buy or build a house or flat.",
      "Owners with a running home loan at their own bank who have never compared it.",
    ],
    ask: [
      "Do you rent or own? If you rent, is buying or building a goal, and by when?",
      "If you have a home loan: who is the lender, how much is still open, how long does it run, and is the rate fixed or variable?",
      "What is your household's net income and what can you comfortably pay each month?",
      "How much of your own money can you put in?",
    ],
    say: [
      "A bank or building society can only offer its own product; we compare several offers side by side.",
      "We explain the advantages and drawbacks of each option openly. The decision is yours.",
      "A loan has costs beyond the interest: processing fee, land register entry, account fee, notary, insurance.",
    ],
    never: [
      "Do not quote an interest rate, a monthly instalment or a saving as if it were on offer. Brochure examples are illustrations from a past date.",
      "Do not call anything an offer. Only the lender can make a binding offer, after its credit check.",
      "Do not suggest a loan is certain. The lender must refuse if the customer will not provide what the credit check needs.",
    ],
    source: "OVB brochure on home financing, reference 180328, edition 03/2020",
  },
  Pension: {
    title: "Long-term saving and private pension",
    summary: "Regular saving over many years. Growth builds on earlier growth, so the starting age matters more than the amount: the same total paid in ends up noticeably larger when it starts earlier.",
    fits: [
      "Younger customers with no long-term savings yet.",
      "Anyone who keeps postponing the start.",
    ],
    ask: [
      "At what age would you like to stop working, and what will you live on then?",
      "Is there an amount you could set aside every month without missing it?",
      "What have you already put in place for later?",
    ],
    say: [
      "Starting five or ten years earlier with the same monthly amount makes a large difference by retirement.",
      "Time does much of the work; waiting is the expensive choice.",
    ],
    never: [
      "Do not present illustration figures as a forecast. They only show the principle.",
      "Do not promise a rate of return. Past values are no guarantee of future development.",
    ],
    source: "OVB brochure on the compound interest effect, reference 180329, edition 03/2020",
  },
  "Child savings": {
    title: "Savings plan for a child",
    summary: "Regular saving for a child, started at birth or soon after. Because the money has decades to grow, payments made in the child's first years can matter more than larger payments made by an adult later.",
    fits: [
      "Parents and grandparents of young children.",
      "Customers expecting a child.",
    ],
    ask: [
      "Do you have children or grandchildren, and how old are they?",
      "Is anything already being saved for them?",
      "What should the money be for: education, a first home, their own retirement?",
    ],
    say: [
      "A plan started at birth has far more time to grow than one started at thirty.",
      "Small regular amounts are enough to begin.",
    ],
    never: [
      "Do not present illustration figures as a forecast. They only show the principle.",
      "Do not promise a rate of return. Past values are no guarantee of future development.",
    ],
    source: "OVB brochure on the compound interest effect, reference 180329, edition 03/2020",
  },
};

export const RULES: { title: string; text: string; source: string }[] = [
  { title: "Brochures inform; contracts decide", text: "Information material is not a sales prospectus. What the customer gets is defined only by the contract documents handed over when the contract is signed.", source: "Both brochures" },
  { title: "A financing example is not an offer", text: "An example calculation is neither the standard European credit information sheet (ESIS, section 8 of the Austrian mortgage credit act, HIKrG) nor a binding offer (section 12 HIKrG). It does not replace a personal consultation.", source: "Home financing brochure" },
  { title: "Loan terms depend on the customer", text: "Interest rate and instalment depend on creditworthiness and are fixed by the lender only after its check. Terms can change, and further costs apply, such as processing fee, notary and insurance.", source: "Home financing brochure" },
  { title: "No credit check, no loan", text: "A lender cannot grant a loan if the customer refuses the information or proof needed to check creditworthiness.", source: "Home financing brochure" },
  { title: "Figures are illustrations", text: "Numbers, dates and rates in savings examples only illustrate a principle. Past values are no guarantee of future development.", source: "Compound interest brochure" },
  { title: "Do not reuse the provider's material", text: "Brochure text and graphics may not be reused or reprinted without OVB's consent. Messages from this system use their own wording and never paste brochure text.", source: "Both brochures" },
  { title: "Only with consent, and not too often", text: "Product messages go only to customers who agreed to offers, on a channel they agreed to, and no more often than the frequency limit in Settings.", source: "This system" },
];
