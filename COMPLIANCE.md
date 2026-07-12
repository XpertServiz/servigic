# Compliance Checklist (Master Brief §15 risk table)

**This is a starting checklist for a founder/ops conversation with a real lawyer in each market — not legal advice, and not exhaustive.** Treat every item as "confirm with counsel," not "confirmed."

## Pakistan (launch market)

- [ ] Business registration (SECP) and tax registration (FBR/provincial) for platform commission revenue
- [ ] Escrow/payment handling — confirm whether holding customer funds before releasing to providers requires any SBP (State Bank) authorization at your transaction volume
- [ ] JazzCash/EasyPaisa merchant agreements (currently manual proof-upload + admin verify — no merchant account needed yet, but automating this later does)
- [ ] Consumer protection: dispute/refund policy (`/legal/terms`, `/trust-and-safety`) reviewed against Pakistan consumer protection law
- [ ] Independent contractor classification for providers (avoid employment-law exposure — the provider agreement checkbox in `/pro/profile` states "jobs close on platform," but classification risk is broader than that one clause)
- [ ] Data protection: CNIC/selfie storage (KYC docs) — confirm retention and access-control requirements
- [ ] WhatsApp Business API commercial terms + Meta Business verification (brief §16: "start the process now, takes weeks")
- [ ] Google Places API terms of service — the Lead Fetcher (`/admin/leads`) scrapes business listings for B2B outreach; confirm this use is within Places API ToS at your call volume

## GCC (Dubai/UAE, Riyadh & Jeddah/KSA) — before going live per GCC_EXPANSION.md

- [ ] Local commercial licensing (UAE: DED or free-zone; KSA: Ministry of Commerce) — home-services marketplaces often need a specific activity license, not just a generic e-commerce one
- [ ] Labor law: UAE and KSA both regulate gig/independent-contractor work differently than Pakistan — confirm provider classification per jurisdiction
- [ ] Data residency: UAE (PDPL) and KSA (PDPL) have their own data protection laws with residency/consent requirements distinct from Pakistan
- [ ] Payment licensing: holding customer funds in escrow may require a money-services or payment-facilitator license (UAE Central Bank / SAMA) depending on structure — this is very likely a bigger lift than Pakistan's equivalent
- [ ] VAT registration (UAE 5%, KSA 15%) on commission revenue
- [ ] The AI Lead-Gen Recruiting Bot is explicitly **out of scope** for GCC numbers per Master Brief §9 — do not reuse it there without separate legal review (telemarketing/spam law differs by jurisdiction)

## Canada / US — before going live

- [ ] Contractor licensing varies by trade and by state/province (e.g. electrical/plumbing often require a licensed-trade credential, not just platform verification) — confirm whether Servigic must verify a real trade license, not just CNIC-style ID
- [ ] Background checks — Angi/Thumbtack-style platforms in North America commonly run criminal background checks on providers; Pakistan's CNIC+police-cert ladder may not be an adequate substitute for a US/Canada launch
- [ ] TCPA (US) / CASL (Canada) — Master Brief §9 already flags this: do not run the recruiting outreach bot on US/Canada numbers
- [ ] State/provincial money-transmitter licensing for escrow, similar to the GCC payment-licensing concern above, likely the single largest compliance lift for this market
- [ ] Worker classification (contractor vs. employee) case law differs meaningfully from Pakistan — this is an active, evolving legal area in both the US (state-by-state) and Canada

## Cross-cutting

- [ ] Terms of Service / Privacy Policy (`/legal/terms`, `/legal/privacy`) are marked as drafts in the app itself — get them reviewed before any market goes live, not just before GCC/NA
- [ ] PCI compliance once automated card processing (Stripe, `src/lib/payments/stripe.ts`) goes live — Stripe handles most of this if you never touch raw card data, confirm your integration stays within Stripe's SAQ-A scope
