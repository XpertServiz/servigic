import { createHash } from "node:crypto";
import { PROFILES } from "@/lib/countryProfile";

// The agreements every customer and every pro accepts (and e-signs) at sign-up: the Customer Terms and the Pro Agreement.
// One text per role, with the parts that depend on the country filled in for the user's own country (the law that applies,
// the electronic-signature law, consumer law, courts, ID document, currency). Based on the Servigic legal launch package
// (Model A: customers pay pros directly; pros are independent; Servigic is the marketplace) and written to put the
// responsibility for damage, loss, injury and theft on the pro who does the work, as far as the law allows.
//
// IMPORTANT: no contract can remove liability that the law does not allow to be removed (for example Servigic's own
// negligence, or a consumer's mandatory rights). The texts say so, which is also what makes the rest enforceable.
// Have them reviewed by counsel in each country before launch, then bump VERSION whenever a word changes: every
// acceptance stores the version, a fingerprint (hash) and a full copy of the text the person accepted.

export const VERSION = "1.1 (27 October 2026)"; // 1.1: face recognition, cancellation fee, one job at a time

export type AgreementRole = "CUSTOMER" | "PROVIDER";
export type DocumentKind = "CUSTOMER_TERMS" | "PRO_AGREEMENT";

export interface AgreementSection {
  title: string;
  paragraphs: string[];
}

export interface Agreement {
  kind: DocumentKind;
  role: AgreementRole;
  country: string;
  countryName: string;
  version: string;
  title: string;
  summary: string[]; // the key points, shown above the full text
  sections: AgreementSection[];
  hash: string;
}

// The operator. Fill these in Vercel (Settings > Environment Variables) once the company is registered.
const OPERATOR = {
  name: process.env.LEGAL_ENTITY_NAME?.trim() || "Servigic",
  address: process.env.LEGAL_ENTITY_ADDRESS?.trim() || "",
  email: process.env.LEGAL_CONTACT_EMAIL?.trim() || "support@servigic.com",
};

interface CountryLaw {
  name: string;
  law: string; // governing law
  courts: string;
  esign: string; // electronic transactions / signature law
  consumer: string; // consumer-protection law named for the reader
  data: string; // data-protection law
  cap: string; // the minimum liability cap, in local money
  language?: string; // a note on the language that prevails, where the law requires one
}

const LAWS: Record<string, CountryLaw> = {
  PK: {
    name: "Pakistan",
    law: "the laws of the Islamic Republic of Pakistan, together with the mandatory laws of the province or territory where the service is performed",
    courts: "the competent courts of Pakistan at the city where the service was performed (Karachi, Lahore or Islamabad), or the consumer court or forum that the law gives you",
    esign: "the Electronic Transactions Ordinance, 2002",
    consumer: "the Sindh Consumer Protection Act, 2014, the Punjab Consumer Protection Act, 2005 and the Islamabad Consumers Protection Act, 1995, as applicable",
    data: "the Prevention of Electronic Crimes Act, 2016 and any data-protection law in force in Pakistan",
    cap: "PKR 10,000",
  },
  SA: {
    name: "the Kingdom of Saudi Arabia",
    law: "the laws and regulations in force in the Kingdom of Saudi Arabia",
    courts: "the competent courts and committees of the Kingdom of Saudi Arabia",
    esign: "the Electronic Transactions Law issued by Royal Decree No. M/18 dated 8/3/1428H",
    consumer: "the E-Commerce Law issued by Royal Decree No. M/126 dated 7/11/1440H and the consumer-protection rules of the Ministry of Commerce",
    data: "the Personal Data Protection Law issued by Royal Decree No. M/19 dated 9/2/1443H",
    cap: "SAR 200",
    language: "Where Saudi law requires an Arabic text, the Arabic version prevails over this English version.",
  },
  AE: {
    name: "the United Arab Emirates",
    law: "the federal laws of the United Arab Emirates and the laws of the emirate where the service is performed",
    courts: "the competent courts of the emirate where the service was performed",
    esign: "Federal Decree-Law No. 46 of 2021 on Electronic Transactions and Trust Services",
    consumer: "Federal Law No. 15 of 2020 on Consumer Protection",
    data: "Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data",
    cap: "AED 200",
    language: "Where UAE law requires an Arabic text, the Arabic version prevails over this English version.",
  },
  QA: {
    name: "the State of Qatar",
    law: "the laws of the State of Qatar",
    courts: "the competent courts of the State of Qatar",
    esign: "Law No. 16 of 2010 on Electronic Commerce and Transactions",
    consumer: "Law No. 8 of 2008 on Consumer Protection",
    data: "Law No. 13 of 2016 on Personal Data Privacy Protection",
    cap: "QAR 200",
    language: "Where Qatari law requires an Arabic text, the Arabic version prevails over this English version.",
  },
  CA: {
    name: "Canada",
    law: "the laws of the province or territory of Canada where the service is performed and the federal laws of Canada applicable there",
    courts: "the courts of the province or territory where the service was performed",
    esign: "the electronic commerce legislation of that province or territory",
    consumer: "the consumer-protection legislation of that province or territory",
    data: "the Personal Information Protection and Electronic Documents Act (PIPEDA) and any applicable provincial privacy law",
    cap: "CAD 70",
  },
  US: {
    name: "the United States",
    law: "the laws of the state where the service is performed and applicable federal law",
    courts: "the state or federal courts located in the state where the service was performed",
    esign: "the federal Electronic Signatures in Global and National Commerce Act (E-SIGN) and the Uniform Electronic Transactions Act as adopted by that state",
    consumer: "the consumer-protection laws of that state",
    data: "applicable federal and state privacy laws",
    cap: "USD 50",
  },
  DE: {
    name: "Germany",
    law: "the laws of the Federal Republic of Germany; if you are a consumer, the mandatory protections of the country where you live also apply",
    courts: "the competent courts in Germany, without prejudice to a consumer's right to sue at home",
    esign: "Regulation (EU) No 910/2014 (eIDAS) and the German Civil Code",
    consumer: "the consumer-protection provisions of the German Civil Code (BGB), including any statutory right of withdrawal",
    data: "the EU General Data Protection Regulation (GDPR) and the German Federal Data Protection Act (BDSG)",
    cap: "EUR 50",
  },
  PL: {
    name: "Poland",
    law: "the laws of the Republic of Poland; if you are a consumer, the mandatory protections of the country where you live also apply",
    courts: "the competent common courts in Poland, without prejudice to a consumer's statutory rights",
    esign: "Regulation (EU) No 910/2014 (eIDAS) and the Polish Civil Code",
    consumer: "the Polish Consumer Rights Act of 30 May 2014",
    data: "the EU General Data Protection Regulation (GDPR)",
    cap: "PLN 200",
  },
};

function lawFor(country: string): CountryLaw {
  return (
    LAWS[country] ?? {
      name: "the country where the service is performed",
      law: "the laws of the country where the service is performed",
      courts: "the competent courts of the country where the service was performed",
      esign: "the electronic-transactions and electronic-signature law of that country",
      consumer: "the consumer-protection law of that country",
      data: "the data-protection law of that country",
      cap: "USD 50 (or its equivalent in local currency)",
    }
  );
}

const idDocFor = (country: string) => PROFILES[country]?.idDoc.en ?? "government-issued photo ID";
const policeDocFor = (country: string) => PROFILES[country]?.policeDoc.en ?? "police clearance certificate";

const PROPERTY = "bathrooms and washrooms, kitchens, pipes and drains, water tanks, tiles, walls, floors, ceilings, doors, windows, wiring, switchboards, fixtures and fittings, furniture, vehicles, and electrical or electronic appliances such as air conditioners, refrigerators, washing machines, water heaters, geysers, motors, pumps and televisions";

function customerTerms(country: string): Omit<Agreement, "hash"> {
  const L = lawFor(country);
  const op = OPERATOR.name;
  return {
    kind: "CUSTOMER_TERMS",
    role: "CUSTOMER",
    country,
    countryName: L.name,
    version: VERSION,
    title: `Servigic Customer Terms and Conditions (${L.name})`,
    summary: [
      "Servigic is a marketplace. Independent pros, not Servigic, do the work and are responsible for it.",
      "You pay the pro directly. Servigic does not collect or hold the money for the service.",
      "If a pro damages your property or appliances, causes injury, or something goes missing, the pro is responsible. Servigic is not, except where the law makes Servigic responsible or Servigic itself was at fault.",
      "Secure your valuables, take photos before and after the work, inspect the work before paying, and report any problem in the app within 48 hours.",
      "Servigic keeps the booking records and the pro's verified identity, and will share them with you, the police or a court as the law allows.",
      "Pros are checked by face recognition each time they open the Servigic Pro app (a live selfie compared with the face on their ID). Servigic does not use face recognition on customers.",
      "Cancelling is free until the Pro is on the way. After that, a cancellation fee applies, shown in the app before you confirm.",
      "Your mandatory rights under consumer law are not affected.",
    ],
    sections: [
      {
        title: "1. Who we are and what these Terms cover",
        paragraphs: [
          `Servigic is a digital marketplace operated by ${op}${OPERATOR.address ? `, ${OPERATOR.address}` : ""} ("Servigic", "we", "us"). These Terms govern your use of the Servigic website and apps as a customer in ${L.name}. By creating an account and accepting these Terms you enter into a binding agreement with Servigic.`,
        ],
      },
      {
        title: "2. Servigic is a marketplace, not the service provider",
        paragraphs: [
          "Servigic connects customers with independent maintenance professionals and service businesses (\"Pros\"). Servigic provides the platform: posting requests, receiving bids, messaging, showing a Pro's information and reviews, and keeping booking records.",
          "Servigic does not perform the work, does not employ the Pros, does not supervise or control how the work is done, and does not guarantee the result. A Pro is not Servigic's employee, partner or agent.",
          "This description does not remove any duty that the law places on Servigic, or liability for Servigic's own acts or omissions.",
        ],
      },
      {
        title: "3. Your contract is with the Pro",
        paragraphs: [
          "When you accept a Pro's bid (or a Pro accepts your offer), you and that Pro make a separate contract for the service. That contract covers the scope of the work, the price, materials, the appointment, and any warranty the Pro gives you.",
          "A request is not confirmed until a bid is accepted in the app. Servigic may keep electronic records of offers, bids, approvals and messages; keeping those records does not make Servigic a party to your contract with the Pro.",
        ],
      },
      {
        title: "4. Prices, offers and payment",
        paragraphs: [
          "You may name the price you want to pay; Pros may accept it or bid their own price. Price guides shown in the app are estimates only.",
          "Before chargeable work begins the Pro must tell you the price or how it is calculated, including call-out or inspection fees, materials and taxes. Any extra work or price change needs your approval first. Do not approve work you do not understand; ask for a written breakdown in the app.",
          "You pay the Pro directly, in cash or as you agree with the Pro, when the work is done. Servigic does not collect, hold or refund the payment for the service. Any fee payable to Servigic itself will be shown to you before you incur it.",
        ],
      },
      {
        title: "5. What verification means",
        paragraphs: [
          `Servigic checks the identity of each Pro (for example the Pro's ${idDocFor(country)}) and, for some trades or levels, other documents such as a ${policeDocFor(country)} or trade qualifications. The app shows which checks were done.`,
          "Verification reduces risk but is not a guarantee of a Pro's skill, honesty, future conduct, insurance or financial capacity.",
          "Face recognition of Pros: each time a Pro opens the Servigic Pro app or signs in, and before he goes online or bids, he must pass a face check - a live selfie that software compares with the face on his ID document and his profile photo. This helps make sure that the person who comes to you is the Pro who was verified. It is a security aid, not a guarantee, and software can make mistakes. The Pro's face data is never shown to you; you see only his profile photo. Servigic does not collect or analyse your face.",
        ],
      },
      {
        title: "6. Your responsibilities",
        paragraphs: [
          "Give accurate details of the job, your address and the fault (including the brand and model of an appliance where relevant).",
          "Tell the Pro about any hazard you know of: old or faulty wiring, gas, leaks, weak structures, asbestos, pets, or previous repairs.",
          "Make sure you have the right to let the Pro work at the property, including any owner, landlord or building permission.",
          "Before the Pro arrives, remove or lock away cash, jewellery, documents, phones and other valuables from the work area.",
          "Keep children, pets and other people away from the work area, and stay present or have a trusted adult present while the Pro is in your home.",
          "Treat Pros with respect, and do not ask for unlawful or unsafe work.",
        ],
      },
      {
        title: "7. Damage to property or appliances, injury, theft and misconduct",
        paragraphs: [
          `7.1 The Pro who performs the work is responsible for any damage, loss or injury caused by the Pro, the Pro's helpers, tools or materials, including damage to ${PROPERTY}, and for any theft or misconduct by them, whether it happens accidentally or deliberately.`,
          "7.2 Because Servigic does not perform, supervise or control the work, Servigic is not liable for such damage, loss, injury, theft or misconduct, to the fullest extent permitted by law. This does not apply where the law makes Servigic responsible, or where the harm was caused by Servigic's own negligence or breach of these Terms.",
          "7.3 Older or already-faulty pipes, wiring, fittings and appliances can fail during or after a repair even when the work is done properly. A Pro is not responsible for a defect that existed before the work and was not caused or made worse by it; the Pro should warn you about such risks before starting. Servigic is not responsible for pre-existing defects in any case.",
          "7.4 Before the work starts, we recommend that you photograph the work area and the appliance, and agree the scope with the Pro in the app.",
          "7.5 After the work, test and inspect it before you pay. Report any damage, missing item, injury or problem to the Pro and to Servigic through the app within 48 hours, with photos and the booking reference. Report theft, injury or anything unsafe immediately. A late report can make it harder to establish what happened, but it does not take away a right the law gives you.",
          "7.6 Claims for damage, loss or injury are to be made against the Pro (and the Pro's insurer, if any). Servigic will help you: we will share the Pro's verified name, contact details and the booking records with you, the police or a court as the law allows, ask the Pro to respond, and may pause the Pro's account while we look into it.",
          "7.7 In an emergency, contact the police, fire service or ambulance first, then tell us.",
        ],
      },
      {
        title: "8. Limitation of Servigic's liability",
        paragraphs: [
          `To the extent permitted by law: (a) Servigic is not liable for indirect or consequential loss, loss of profit, loss of income or loss of opportunity; and (b) Servigic's total liability to you for any claim connected with the platform is limited to the greater of the fees you paid to Servigic in the 12 months before the claim and ${L.cap}.`,
          "Nothing in these Terms limits or excludes liability for death or personal injury caused by Servigic's negligence, for fraud, or any other liability that cannot be limited or excluded by law.",
        ],
      },
      {
        title: "9. Your conduct and fair use",
        paragraphs: [
          "Do not post false requests or reviews, fabricate evidence, impersonate anyone, harass or threaten a Pro, or use the platform for anything unlawful.",
          "If you knowingly make a false claim against a Pro or Servigic, you are responsible for the loss and reasonable costs it causes, to the extent the law allows.",
        ],
      },
      {
        title: "10. Cancellations",
        paragraphs: [
          "You may cancel a request in the app. Cancelling a booking is free until the Pro is on the way. Once the Pro has left for your address, a cancellation fee applies: a percentage of the agreed price, higher once the Pro has arrived, that the app shows you before you confirm the cancellation. The fee compensates the Pro for the trip, and the same fee applies if the Pro arrives and nobody is at the address.",
          "No fee applies if the Pro was late, asked you to cancel, or could not do the job. Until a cancellation fee is cleared with Servigic you cannot post new requests, and repeated late cancellations may reduce how many Pros see your requests. A refund of money you paid directly to a Pro is a matter between you and the Pro, subject to the law.",
        ],
      },
      {
        title: "11. Privacy and records",
        paragraphs: [
          `We handle your personal data under our Privacy Policy and ${L.data}. We share your name, address and job details with the Pro you choose so the work can be done.`,
          "We keep booking records, messages, photos, bids, approvals and this acceptance record as evidence, for as long as is reasonably needed to deal with complaints, claims and the law.",
          "We do not take, store or analyse your face. Photos and videos you add to a request are used only to describe the job to Pros and are deleted from our servers 24 hours after the job ends, unless a dispute is open.",
        ],
      },
      {
        title: "12. Suspension and termination",
        paragraphs: [
          "We may restrict or close an account for fraud, serious misconduct, safety risks or repeated breaches. Where appropriate and lawful we will tell you why and let you respond. You may close your account at any time.",
        ],
      },
      {
        title: "13. Electronic acceptance and signature",
        paragraphs: [
          `You accept these Terms electronically. Ticking the acceptance box and typing your full name is your electronic signature and has the same effect as a handwritten signature under ${L.esign}.`,
          "We record the version of these Terms you accepted, a fingerprint of the exact text, the date and time, your account, and the IP address and device used. You can view and download your signed copy at any time.",
        ],
      },
      {
        title: "14. Governing law and disputes",
        paragraphs: [
          `These Terms are governed by ${L.law}. Disputes are subject to ${L.courts}. Nothing in these Terms removes the rights you have under ${L.consumer} or any other mandatory law.`,
          "Before going to court, please contact us through the app so we can try to resolve the matter quickly.",
          ...(L.language ? [L.language] : []),
        ],
      },
      {
        title: "15. Changes and contact",
        paragraphs: [
          "We may update these Terms. Important changes will be shown to you in the app and you will be asked to accept them again where the law or the change requires it. If a provision is unenforceable, the rest stays in force.",
          `Contact: ${OPERATOR.email}, or the help option in the app.`,
        ],
      },
    ],
  };
}

function proAgreement(country: string): Omit<Agreement, "hash"> {
  const L = lawFor(country);
  const op = OPERATOR.name;
  return {
    kind: "PRO_AGREEMENT",
    role: "PROVIDER",
    country,
    countryName: L.name,
    version: VERSION,
    title: `Servigic Pro Agreement (${L.name})`,
    summary: [
      "You are an independent professional or business, not a Servigic employee. You choose your jobs and set your own prices.",
      "You are fully responsible for the work you do and for any damage to a customer's property or appliances, injury, loss or theft caused by you or your helpers, accidental or deliberate.",
      "You must repair, replace or compensate such damage, and you protect Servigic from any claim it causes (indemnity).",
      "Check and photograph the work area before starting, warn the customer about existing defects, and get approval for any extra work or price.",
      "Your documents must be genuine. Servigic may share your verified identity and records with the customer, the police or a court as the law allows.",
      "Customers pay you directly; you pay Servigic's fees as shown in the app.",
      "Face recognition: every time you open the app or sign in, you take a live selfie that is compared with your ID photo and profile photo. You consent to this by accepting. The selfie itself is not saved.",
      "Finish the job you are on before you head to the next one. If a customer cancels after you left, or nobody is there, a cancellation fee applies and your share is credited to your wallet once it is paid.",
    ],
    sections: [
      {
        title: "1. Parties and scope",
        paragraphs: [
          `This Agreement is between ${op}${OPERATOR.address ? `, ${OPERATOR.address}` : ""} trading as Servigic ("Servigic") and you, the professional or business identified in your Servigic account (the "Pro"), for work in ${L.name}. It governs your use of the Servigic Pro app and website. The Customer Terms, the fees shown in the app, and Servigic's safety, verification, privacy and complaint policies form part of this Agreement.`,
        ],
      },
      {
        title: "2. Independent business",
        paragraphs: [
          "You are an independent professional or business. Nothing in this Agreement makes you an employee, partner, agent or representative of Servigic, and you must not present yourself as one.",
          "You decide which jobs to bid on or accept, your prices, your working methods, your tools and materials, and your working hours. You are responsible for your own taxes, registrations, licences and any helpers you bring.",
        ],
      },
      {
        title: "3. Accepting jobs",
        paragraphs: [
          "Only bid on or accept work that you are competent, qualified, licensed (where the law requires it) and equipped to do safely and lawfully. Electrical, gas, air-conditioning/refrigerant and structural work must only be done where you hold any authorisation the law requires.",
          "Once a booking is accepted, keep the appointment and the agreed scope, or tell the customer and Servigic promptly if you cannot.",
          "You may bid on a new job while you are finishing another, and the customer will see that you are finishing one first, so give an arrival time you can keep. You must mark your current job done before you set off for the next one.",
          "If a customer cancels after you have left, or you arrive and nobody is at the address, use the \"customer not available\" option in the app so that your trip is recorded (time and your phone's location). A cancellation fee then applies to the customer; once Servigic has collected it, your share (the fee less Servigic's usual commission) is credited to your wallet. No fee applies if you were late or asked the customer to cancel.",
        ],
      },
      {
        title: "4. Prices and changes",
        paragraphs: [
          "You set your prices. You may accept the customer's offered price or bid your own. Before chargeable work begins, tell the customer the price or how it is calculated, including inspection/call-out fees, materials and taxes.",
          "Any extra work or price change needs the customer's approval in the app before you do it, except where the law allows an emergency exception. Never demand payment that was not agreed.",
        ],
      },
      {
        title: "5. Payment and Servigic's fees",
        paragraphs: [
          "The customer pays you directly. You are responsible for collecting payment, giving any receipt or invoice the law requires, and your taxes. Do not claim that Servigic received, guaranteed or will refund any payment.",
          "You pay Servigic the fees shown in the app (for example through your Servigic wallet). Report jobs from Servigic honestly; do not move customers you met on Servigic off the platform to avoid fees.",
        ],
      },
      {
        title: "6. Identity, documents and verification",
        paragraphs: [
          `You must give true and complete information and genuine documents, including your ${idDocFor(country)} and, where asked, a ${policeDocFor(country)}, trade certificates, licences and insurance documents, and keep them up to date. You authorise Servigic to verify them by lawful means.`,
          "Forged or borrowed documents, impersonation, or letting someone else use your account are serious breaches: Servigic may close your account immediately and report the matter to the authorities.",
          `Face recognition. To make sure the person who works is the person who registered, the Servigic Pro app asks you for a live selfie every time you open the app or sign in, and before you go online or bid. Software compares the selfie with the face on your ${idDocFor(country)} and with your Servigic profile photo.`,
          `Your consent. A face is biometric personal data. By accepting this Agreement and using the Pro app you give Servigic your free, specific and informed consent to collect and process your face image for this purpose only: confirming your identity, preventing the misuse of accounts and keeping customers safe. The check is a condition of working through Servigic. You may withdraw your consent at any time by writing to ${OPERATOR.email}; your account is then paused because it cannot be verified, and your other rights stay.`,
          `What we keep. The live selfie is checked in memory and is not saved. We keep a numeric face template made from your ID photo and profile photo (not the photo itself), and the time, result and match score of each check, for as long as your account is active and for 12 months after it is closed, and then delete them. We do not sell or rent your face data and do not show it to customers or advertisers. We share it only with service providers who process it for us under confidentiality, or where the law or a court requires it. This is done under ${L.data}.`,
          "A fair review. The software can make mistakes (poor light, a cap, glasses, a new haircut). A failed check alone never ends your account: after three failed tries a person at Servigic looks at your case and can approve you. Never let anyone else take the selfie for you: that is impersonation and a serious breach. You may ask for access to, correction or deletion of your data as the law allows, by writing to the contact address in this Agreement.",
        ],
      },
      {
        title: "7. Standards of work and safety",
        paragraphs: [
          "Work with reasonable skill, care and diligence, follow the law, building rules and safety standards, and use suitable tools, materials and parts.",
          "Explain risks and limitations, never recommend unnecessary work, and leave the work area safe and tidy. Stop work and tell the customer if continuing would be unsafe.",
        ],
      },
      {
        title: "8. Conduct at the customer's premises",
        paragraphs: [
          "Respect the customer's home, property, privacy and safety. Theft, harassment, threats, discrimination, misuse of keys or access codes, and photographing anything unrelated to the job are strictly prohibited.",
          "You are responsible for anyone you bring with you. Only bring helpers who are needed for the job, and tell the customer in advance.",
        ],
      },
      {
        title: "9. Responsibility for damage, loss, injury and theft",
        paragraphs: [
          `9.1 You are solely and fully responsible for any damage to a customer's or any other person's property, including ${PROPERTY}, for any loss or theft, and for any injury or death, caused by you, your helpers, your tools or your materials, whether it happens accidentally or deliberately.`,
          "9.2 You must promptly repair, replace or pay fair compensation for such damage or loss, as agreed with the customer or as decided by a competent authority or court.",
          "9.3 Before starting, inspect the work area and the appliance, tell the customer about any existing defect or risk (for example old pipes, weak fittings or faulty wiring), photograph them in the app or your phone, and agree the scope. You are not responsible for a defect that existed before your work and was not caused or made worse by it, but you must prove what was there, so take photos.",
          "9.4 You are strongly advised, and where the law or Servigic's rules for your trade require it you are obliged, to hold suitable insurance (for example public-liability insurance). Insurance does not reduce your responsibility.",
          "9.5 Servigic does not perform, supervise or control your work and does not pay compensation for damage, loss, injury or theft caused by you or your helpers.",
          "9.6 Indemnity: to the extent permitted by law, you will indemnify and hold harmless Servigic, its owners, directors and staff against any claim, loss, damage, fine, penalty and reasonable cost (including legal fees) arising from your work, your conduct or that of your helpers, your breach of this Agreement, or your breach of the law. This does not cover losses caused by Servigic's own fault.",
          "9.7 If Servigic is required to pay anything because of something you or your helpers did, you must repay Servigic on demand, and Servigic may, where lawful, set it off against any credit or amount it owes you.",
          "9.8 Respond to a damage or misconduct complaint within 24 hours, cooperate in good faith, and keep your photos, messages and records. Servigic may share your verified identity, contact details and booking records with the customer, the police or a court as the law allows, and may pause your account while a complaint is looked into.",
        ],
      },
      {
        title: "10. Workmanship",
        paragraphs: [
          "You are responsible for the quality of your work and for any remedy the law requires (for example correcting defective work). If you offer your own warranty, state its duration and terms to the customer clearly before starting. Servigic does not give a warranty on your work.",
        ],
      },
      {
        title: "11. Customer data and confidentiality",
        paragraphs: [
          `Use a customer's details only to quote for, perform and follow up the job. Do not share, sell or misuse them, and keep your phone and records secure, in line with ${L.data}. Report any suspected data leak to Servigic straight away.`,
        ],
      },
      {
        title: "12. Suspension and termination",
        paragraphs: [
          "Servigic may suspend or close your account for breach, fraud, forged documents, unsafe work, unlawful conduct or repeated substantiated complaints. Where appropriate and lawful you will be told why and may respond; urgent restrictions may apply straight away when there is a credible risk.",
          "Ending this Agreement does not end fees already due, your responsibility for work already done, or clauses 9, 11 and 14.",
        ],
      },
      {
        title: "13. Limitation of Servigic's liability",
        paragraphs: [
          `To the extent permitted by law, Servigic is not liable to you for loss of income, profit or opportunity, or for indirect loss, and its total liability to you is limited to the fees you paid to Servigic in the 3 months before the claim. Nothing limits liability that cannot be limited by law.`,
        ],
      },
      {
        title: "14. Electronic acceptance and signature",
        paragraphs: [
          `You accept this Agreement electronically. Ticking the acceptance box and typing your full name is your electronic signature and has the same effect as a handwritten signature under ${L.esign}.`,
          "Servigic records the version you accepted, a fingerprint of the exact text, the date and time, your account, and the IP address and device used. You can view and download your signed copy at any time.",
        ],
      },
      {
        title: "15. Governing law and disputes",
        paragraphs: [
          `This Agreement is governed by ${L.law}. Disputes are subject to ${L.courts}. The parties will first try to resolve a dispute through Servigic's support channel in good faith.`,
          ...(L.language ? [L.language] : []),
        ],
      },
      {
        title: "16. Changes",
        paragraphs: [
          "Servigic may update this Agreement or its fees for the future. Important changes will be shown in the app and you will be asked to accept them before you can keep bidding. If a provision is unenforceable, the rest stays in force.",
          `Contact: ${OPERATOR.email}, or the help option in the Pro app.`,
        ],
      },
    ],
  };
}

/** Canonical text of an agreement (what the fingerprint is taken of, and what is stored with each acceptance). */
export function agreementText(a: Omit<Agreement, "hash"> | Agreement): string {
  const lines = [a.title, `Version ${a.version}`, "", "Key points:", ...a.summary.map((s) => `- ${s}`), ""];
  for (const s of a.sections) lines.push(s.title, ...s.paragraphs, "");
  return lines.join("\n");
}

export function getAgreement(role: AgreementRole, countryInput: string | null | undefined): Agreement {
  const country = (countryInput ?? "").toUpperCase().match(/^[A-Z]{2}$/) ? (countryInput as string).toUpperCase() : "XX";
  const base = role === "PROVIDER" ? proAgreement(country) : customerTerms(country);
  const hash = createHash("sha256").update(agreementText(base)).digest("hex");
  return { ...base, hash };
}
