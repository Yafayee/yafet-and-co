import type { Settings, Template } from "./types";

// Placeholders: {firstName} {lastName} {product} {sender}
export const DEFAULT_TEMPLATES: Record<string, Template> = {
  birthday: {
    label: "Birthday greeting", purpose: "birthday",
    de: { subject: "Alles Gute zum Geburtstag!", body: "Guten Tag {firstName} {lastName},\n\nzu Ihrem Geburtstag wünsche ich Ihnen alles Gute, viel Gesundheit und einen wunderschönen Tag.\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "Happy birthday!", body: "Hello {firstName},\n\nHappy birthday! I wish you good health and a wonderful day.\n\nKind regards\n{sender}" },
  },
  christmas: {
    label: "Christmas greeting", purpose: "holiday",
    de: { subject: "Frohe Weihnachten", body: "Guten Tag {firstName} {lastName},\n\nich wünsche Ihnen und Ihrer Familie frohe Weihnachten, erholsame Feiertage und einen guten Rutsch ins neue Jahr. Vielen Dank für Ihr Vertrauen.\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "Merry Christmas", body: "Hello {firstName},\n\nI wish you and your family a merry Christmas, restful holidays and a happy New Year. Thank you for your trust.\n\nKind regards\n{sender}" },
  },
  newyear: {
    label: "New Year greeting", purpose: "holiday",
    de: { subject: "Ein gutes neues Jahr", body: "Guten Tag {firstName} {lastName},\n\nich wünsche Ihnen ein gesundes und erfolgreiches neues Jahr.\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "Happy New Year", body: "Hello {firstName},\n\nI wish you a healthy and successful New Year.\n\nKind regards\n{sender}" },
  },
  easter: {
    label: "Easter greeting", purpose: "holiday",
    de: { subject: "Frohe Ostern", body: "Guten Tag {firstName} {lastName},\n\nich wünsche Ihnen und Ihrer Familie frohe Ostern und erholsame Feiertage.\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "Happy Easter", body: "Hello {firstName},\n\nI wish you and your family a happy Easter.\n\nKind regards\n{sender}" },
  },
  offer: {
    label: "Product offer", purpose: "marketing",
    de: { subject: "Ein Gedanke zu Ihrer Absicherung", body: "Guten Tag {firstName} {lastName},\n\nbei der Durchsicht Ihrer Unterlagen ist mir aufgefallen, dass Sie noch keine {product} bei uns haben. Gerne zeige ich Ihnen in einem kurzen, kostenlosen Gespräch, ob das für Ihre Situation sinnvoll ist.\n\nPasst Ihnen ein Termin in den nächsten zwei Wochen?\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "A thought on your cover", body: "Hello {firstName},\n\nWhile reviewing your file I noticed you do not yet have {product} with us. I would be happy to show you in a short, free conversation whether it makes sense for your situation.\n\nWould a call in the next two weeks suit you?\n\nKind regards\n{sender}" },
  },
  carQuestion: {
    label: "Car ownership question", purpose: "marketing",
    de: { subject: "Kurze Frage zu Ihrem Fahrzeug", body: "Guten Tag {firstName} {lastName},\n\nich hoffe, es geht Ihnen gut. Eine kurze Frage: Besitzen Sie derzeit ein Auto? Falls ja, vergleiche ich gerne unverbindlich Ihre Kfz-Versicherung für Sie.\n\nEine kurze Antwort genügt.\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "A quick question about your car", body: "Hello {firstName},\n\nI hope you are well. A quick question: do you currently own a car? If so, I would be glad to compare your car insurance for you, with no obligation.\n\nA short reply is all I need.\n\nKind regards\n{sender}" },
  },
  followUp: {
    label: "Follow-up after birthday", purpose: "marketing",
    de: { subject: "Kurz nachgefragt", body: "Guten Tag {firstName} {lastName},\n\nich hoffe, Sie hatten einen schönen Geburtstag. Bei dieser Gelegenheit habe ich mir Ihre Absicherung angesehen: Eine {product} fehlt derzeit noch. Darf ich Ihnen dazu unverbindlich ein paar Informationen geben?\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "A quick follow-up", body: "Hello {firstName},\n\nI hope you had a lovely birthday. I took the occasion to look at your cover: you do not yet have {product}. May I send you some information, with no obligation?\n\nKind regards\n{sender}" },
  },
  financing: {
    label: "Home financing (renting today)", purpose: "marketing",
    de: { subject: "Vom Mieten zum Eigenheim?", body: "Guten Tag {firstName} {lastName},\n\ndenken Sie darüber nach, eine Wohnung oder ein Haus zu kaufen oder zu bauen? Gerne hole ich unverbindlich Finanzierungsangebote mehrerer Banken für Sie ein und erkläre Ihnen die Unterschiede.\n\nDie konkreten Konditionen hängen von Ihrer persönlichen Situation ab und werden von der jeweiligen Bank nach ihrer Prüfung festgelegt.\n\nHaben Sie Interesse an einem kurzen Gespräch?\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "From renting to your own home?", body: "Hello {firstName},\n\nAre you thinking about buying or building a home? I would be glad to collect financing offers from several banks for you, with no obligation, and explain the differences.\n\nThe actual terms depend on your personal situation and are set by the bank after its own check.\n\nWould a short conversation interest you?\n\nKind regards\n{sender}" },
  },
  refinancing: {
    label: "Home financing (existing loan)", purpose: "marketing",
    de: { subject: "Ihre laufende Finanzierung im Vergleich", body: "Guten Tag {firstName} {lastName},\n\nSie haben eine laufende Immobilienfinanzierung. Es kann sinnvoll sein, die Konditionen von Zeit zu Zeit vergleichen zu lassen. Gerne prüfe ich unverbindlich, ob eine Umschuldung für Sie in Frage kommt.\n\nOb sich ein Wechsel lohnt, hängt von Ihrem bestehenden Vertrag und Ihrer persönlichen Situation ab; verbindliche Konditionen nennt erst die Bank nach ihrer Prüfung.\n\nDarf ich mich dazu bei Ihnen melden?\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "Comparing your current home loan", body: "Hello {firstName},\n\nYou have a home loan running. It can be worth having the terms compared from time to time. I would be glad to check, with no obligation, whether refinancing is an option for you.\n\nWhether a switch pays off depends on your existing contract and your personal situation; binding terms come only from the bank after its own check.\n\nMay I get in touch about this?\n\nKind regards\n{sender}" },
  },
  childSavings: {
    label: "Savings plan for a child", purpose: "marketing",
    de: { subject: "Vorsorge für Ihr Kind", body: "Guten Tag {firstName} {lastName},\n\nwer früh beginnt, für ein Kind vorzusorgen, gibt dem Ersparten viel Zeit zu wachsen. Gerne zeige ich Ihnen unverbindlich, welche Möglichkeiten der Kindervorsorge es gibt und was zu Ihrer Familie passt.\n\nHaben Sie Interesse an einem kurzen Gespräch?\n\nHerzliche Grüße\n{sender}" },
    en: { subject: "Saving for your child", body: "Hello {firstName},\n\nStarting early to save for a child gives the money a long time to grow. I would be glad to show you, with no obligation, which options exist and what suits your family.\n\nWould a short conversation interest you?\n\nKind regards\n{sender}" },
  },
};

export const DEFAULT_SETTINGS: Settings = {
  capDays: 30,
  autoLockMin: 15,
  senderName: "Ihr CP Consulting Team",
  followUpAfterBirthday: true,
  templates: DEFAULT_TEMPLATES,
};
