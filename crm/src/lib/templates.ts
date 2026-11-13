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
};

export const DEFAULT_SETTINGS: Settings = {
  capDays: 30,
  autoLockMin: 15,
  senderName: "Ihr CP Consulting Team",
  followUpAfterBirthday: true,
  templates: DEFAULT_TEMPLATES,
};
