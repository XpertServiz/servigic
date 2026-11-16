@AGENTS.md

## Big Projects (bulk contracts)
- Shipped dark: set `FEATURE_BULK_PROJECTS=true` in Vercel to show the /projects pages, admin menu, APIs and app cards.
- Servigic is the contracting party; pros do labour only. There is no commission: the admin sets a **contract amount** after the free site visit. 15-day fix guarantee (`warrantyDays`).
- Code: `src/lib/bigProjects*.ts`, `src/app/projects`, `src/app/e/[token]` (private estimate link), `src/app/admin/projects`, `src/app/api/{projects,mobile/projects,mobile/provider/projects,admin/projects}`.
- Env: `PROJECTS_ADMIN_EMAILS`, `PROJECTS_SLA_FIRST_CONTACT_MIN` (default 120), `PROJECTS_INVITE_RESPONSE_HOURS`, optional `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (captcha is skipped when blank).
- The job-health cron runs the 2-hour first-contact reminder and the pro-invitation reminder/expiry sweep.
