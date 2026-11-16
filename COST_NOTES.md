# Cost notes
- Big Projects adds no always-on cost. The 18 SEO pages are static (hourly revalidate); `/e/[token]` and the admin pages are dynamic but low traffic.
- The only recurring work is inside the existing 15-minute job-health cron (two cheap indexed queries, only when the flag is on).
- Emails go through Resend (a handful per project). Push uses Expo (free).
- Turnstile is free; it is off until both keys are set.
