// Copy for the Big Projects pages. English and Urdu are written by hand; every other language falls back to English until a human
// reviewed translation is added (do not machine-publish them). No invented numbers, reviews or guarantees: only what Servigic offers
// (free site visit, one written contract amount agreed after the visit, verified pros for labour, 15-day fix guarantee).
export type Lang = "en" | "ur";

type FaqItem = { q: string; a: string };
type Copy = {
  eyebrow: string; h1: string; sub: string; cta: string; whatsapp: string;
  trust: string[]; handleTitle: string; stepsTitle: string; steps: [string, string][]; whyTitle: string; why: [string, string][];
  forTitle: string; forList: string[]; sampleTitle: string; sampleNote: string; faqTitle: string; faq: FaqItem[]; formTitle: string; metaTitle: string; metaDesc: string;
};

export const COPY: Record<Lang, Copy> = {
  en: {
    eyebrow: "Big Projects",
    h1: "Building or renovating? Get the whole job done by verified pros.",
    sub: "Tell us about your project. We call you, visit your site free, agree one clear amount with you in writing, and Servigic's verified pros do the work.",
    cta: "Get free estimate", whatsapp: "WhatsApp us",
    trust: ["Verified pros", "Free site visit", "Written contract amount", "Work in stages you approve", "15-day fix guarantee"],
    handleTitle: "What we handle",
    stepsTitle: "How it works",
    steps: [["Submit your request", "Two minutes: the trades, where, your phone and email."], ["We call and visit your site", "A Servigic specialist calls you, then visits the site. The visit is free."], ["You get one clear amount", "After the visit you get the contract amount in writing before any work starts."], ["Verified pros do the work", "Work is done in stages. You approve each stage, and Servigic stays responsible for the whole job."]],
    whyTitle: "Why Servigic",
    why: [["One team accountable end to end", "You deal with Servigic, not with a different contractor for each trade."], ["Verified pros", "Pros are checked by Servigic before they can take work."], ["A clear amount", "No surprise price on the day. The amount is agreed in writing after the site visit."], ["Support in Urdu and English", "Call or WhatsApp us at any time during the project."]],
    forTitle: "Who it is for",
    forList: ["Home builders", "Renovation owners", "Shop and office fit-outs", "Builders and developers", "Societies and facility managers"],
    sampleTitle: "What your estimate looks like", sampleNote: "Sample layout only. Your amount is set after the site visit.",
    faqTitle: "Questions people ask",
    faq: [
      { q: "How is the price decided?", a: "After we visit your site, Servigic gives you one contract amount in writing. We do not publish price lists because every site is different." },
      { q: "Is the site visit free?", a: "Yes. The site visit is free." },
      { q: "Who does the work?", a: "Verified pros chosen by Servigic, working for Servigic. You deal with Servigic for the whole job." },
      { q: "What if something goes wrong after the work?", a: "If there is a problem within 15 days, Servigic comes back and fixes it." },
      { q: "How long will it take?", a: "We give you the schedule with the estimate, after we have seen the site." },
      { q: "Are materials included?", a: "Each line of the estimate says whether the materials are supplied by you or by Servigic." },
      { q: "How do I pay?", a: "Payment is in stages, agreed in the estimate. You approve each stage before it is closed." },
      { q: "Which cities do you cover?", a: "We are starting in Karachi, Lahore and Islamabad." },
      { q: "Can I choose the pro?", a: "Servigic assigns the right team for your trades. Tell us your preferences on the call." },
      { q: "What happens to my data?", a: "We use your details only to contact you about this request. See our Privacy Policy." },
    ],
    formTitle: "Tell us about your project",
    metaTitle: "Big Projects: house wiring, plumbing and renovation | Servigic",
    metaDesc: "Building or renovating in Karachi, Lahore or Islamabad? Free site visit, one written contract amount, verified pros and a 15-day fix guarantee.",
  },
  ur: {
    eyebrow: "بڑے پراجیکٹس",
    h1: "گھر بنا رہے ہیں یا رینوویٹ؟ پورا کام تصدیق شدہ ماہرین سے کروائیں۔",
    sub: "اپنے پراجیکٹ کے بارے میں بتائیں۔ ہم آپ کو کال کرتے ہیں، مفت سائٹ وزٹ کرتے ہیں، تحریری طور پر ایک واضح رقم طے کرتے ہیں، اور سروجک کے تصدیق شدہ ماہرین کام کرتے ہیں۔",
    cta: "مفت اندازہ حاصل کریں", whatsapp: "واٹس ایپ کریں",
    trust: ["تصدیق شدہ ماہرین", "مفت سائٹ وزٹ", "تحریری معاہدے کی رقم", "مراحل میں کام، آپ کی منظوری سے", "15 دن کی مرمت کی گارنٹی"],
    handleTitle: "ہم کون سے کام کرتے ہیں",
    stepsTitle: "کیسے کام کرتا ہے",
    steps: [["درخواست بھیجیں", "دو منٹ: کام کی قسم، جگہ، فون اور ای میل۔"], ["ہم کال کرتے ہیں اور سائٹ دیکھتے ہیں", "سروجک کا ماہر آپ کو کال کرتا ہے اور سائٹ کا دورہ کرتا ہے۔ یہ دورہ مفت ہے۔"], ["آپ کو ایک واضح رقم ملتی ہے", "دورے کے بعد، کام شروع ہونے سے پہلے آپ کو تحریری معاہدے کی رقم ملتی ہے۔"], ["تصدیق شدہ ماہرین کام کرتے ہیں", "کام مراحل میں ہوتا ہے۔ ہر مرحلہ آپ منظور کرتے ہیں، اور پورے کام کی ذمہ داری سروجک کی ہے۔"]],
    whyTitle: "سروجک کیوں",
    why: [["ایک ٹیم، مکمل ذمہ داری", "ہر کام کے لیے الگ ٹھیکیدار نہیں، آپ صرف سروجک سے بات کرتے ہیں۔"], ["تصدیق شدہ ماہرین", "کام ملنے سے پہلے سروجک ماہرین کی جانچ کرتا ہے۔"], ["واضح رقم", "آخری دن کوئی نئی قیمت نہیں۔ رقم سائٹ وزٹ کے بعد تحریری طے ہوتی ہے۔"], ["اردو اور انگریزی میں مدد", "پراجیکٹ کے دوران کسی بھی وقت کال یا واٹس ایپ کریں۔"]],
    forTitle: "کن کے لیے",
    forList: ["گھر بنانے والے", "رینوویشن کرانے والے", "دکان اور دفتر کی فٹ آؤٹ", "بلڈرز اور ڈویلپرز", "سوسائٹیاں اور فیسیلیٹی مینیجرز"],
    sampleTitle: "آپ کا اندازہ کیسا ہوگا", sampleNote: "صرف نمونہ۔ آپ کی رقم سائٹ وزٹ کے بعد طے ہوگی۔",
    faqTitle: "عام سوالات",
    faq: [
      { q: "قیمت کیسے طے ہوتی ہے؟", a: "ہم آپ کی سائٹ دیکھنے کے بعد تحریری طور پر ایک معاہدے کی رقم دیتے ہیں۔ ہر سائٹ مختلف ہوتی ہے اس لیے ہم ریٹ لسٹ شائع نہیں کرتے۔" },
      { q: "کیا سائٹ وزٹ مفت ہے؟", a: "جی ہاں، سائٹ وزٹ مفت ہے۔" },
      { q: "کام کون کرتا ہے؟", a: "سروجک کے منتخب کردہ تصدیق شدہ ماہرین۔ پورے کام کے لیے آپ سروجک سے رابطے میں رہتے ہیں۔" },
      { q: "کام کے بعد مسئلہ ہو جائے تو؟", a: "15 دن کے اندر کوئی مسئلہ ہو تو سروجک واپس آ کر ٹھیک کرتا ہے۔" },
      { q: "کتنا وقت لگے گا؟", a: "سائٹ دیکھنے کے بعد ہم اندازے کے ساتھ شیڈول بھی دیتے ہیں۔" },
      { q: "کیا میٹریل شامل ہے؟", a: "اندازے کی ہر لائن بتاتی ہے کہ میٹریل آپ کا ہے یا سروجک کا۔" },
      { q: "ادائیگی کیسے ہوتی ہے؟", a: "ادائیگی مراحل میں ہوتی ہے جو اندازے میں طے ہوتے ہیں۔ ہر مرحلہ بند ہونے سے پہلے آپ منظور کرتے ہیں۔" },
      { q: "کن شہروں میں؟", a: "ہم کراچی، لاہور اور اسلام آباد سے شروع کر رہے ہیں۔" },
      { q: "کیا میں ماہر خود چن سکتا ہوں؟", a: "سروجک آپ کے کام کے مطابق درست ٹیم لگاتا ہے۔ کال پر اپنی پسند بتائیں۔" },
      { q: "میرا ڈیٹا؟", a: "آپ کی معلومات صرف اسی درخواست پر رابطے کے لیے استعمال ہوتی ہیں۔ پرائیویسی پالیسی دیکھیں۔" },
    ],
    formTitle: "اپنے پراجیکٹ کے بارے میں بتائیں",
    metaTitle: "بڑے پراجیکٹس: گھر کی وائرنگ، پلمبنگ اور رینوویشن | سروجک",
    metaDesc: "کراچی، لاہور یا اسلام آباد میں گھر بنا رہے ہیں؟ مفت سائٹ وزٹ، تحریری معاہدے کی رقم، تصدیق شدہ ماہرین اور 15 دن کی گارنٹی۔",
  },
};

export const SEO_CITIES = [
  { slug: "karachi", name: "Karachi", local: "Karachi homes deal with heat, humidity and salty air, and many buildings are apartments in tall blocks where one shared riser serves many floors. Load-shedding also means many owners plan UPS or solar backup from the start." },
  { slug: "lahore", name: "Lahore", local: "Lahore has a lot of older houses in established areas being rebuilt or renovated, and new construction in the large housing societies. Old wiring and old pipes are common, so we check what can stay and what must be replaced." },
  { slug: "islamabad", name: "Islamabad", local: "Islamabad homes are mostly built in sectors and private societies with larger plots and several floors. Cold winters make pipe layout and insulation worth planning properly, and new houses are usually finished in stages." },
] as const;

export const SEO_TRADES = [
  { slug: "electrical-wiring", key: "electrical", name: "Electrical wiring", intro: "Whole-house wiring done as one job: conduit and boxes, cable pulling, the distribution board, earthing, switches and fixtures, and a test at the end.", points: ["Concealed or surface conduit, as you prefer", "Distribution board and earthing", "Wiring planned for ACs, geysers and backup (UPS or solar)", "Testing before handover"] },
  { slug: "plumbing", key: "plumbing", name: "Plumbing", intro: "Complete plumbing for a new house or a renovation: water supply lines, drainage, bathrooms and kitchens, tanks, and hot water lines.", points: ["Supply and drainage laid out together", "Bathrooms and kitchens", "Underground and overhead tank connections", "Pressure and leak testing before the walls are closed"] },
  { slug: "painting", key: "painting", name: "Painting", intro: "Interior and exterior painting for the whole property, including surface preparation, putty and primer where the walls need it.", points: ["Interior and exterior", "Wall repair, putty and primer", "Your paint brand or our recommendation", "Room-by-room stages you approve"] },
  { slug: "tiling-flooring", key: "tiling", name: "Tiling and flooring", intro: "Floor and wall tiling and other flooring for the whole property, with the levels and the layout planned before work starts.", points: ["Floors, bathrooms, kitchens and walls", "Level checks and layout plan", "Tile and material supply by you or by Servigic", "Clean finish and cleanup"] },
  { slug: "carpentry", key: "carpentry", name: "Carpentry and woodwork", intro: "Doors, kitchens, wardrobes and other woodwork made and fitted as one job with the rest of your project.", points: ["Doors, windows and frames", "Kitchen and wardrobe work", "Measured on site", "Fitted and adjusted before handover"] },
  { slug: "full-renovation", key: "renovation", name: "Full renovation", intro: "Renovating a whole home or shop: several trades coordinated by Servigic so one team is responsible from the first visit to the handover.", points: ["Wiring, plumbing, tiling, painting and woodwork together", "One schedule across all trades", "Work in stages you approve", "One contract amount in writing"] },
] as const;
