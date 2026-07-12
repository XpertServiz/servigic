# AWS Migration Path (P7+, Master Brief §3/§11)

Status: **not needed yet.** Per the brief's own cost model (§11), UploadThing (2GB free) and the in-process `notify()` fan-out comfortably cover pre-revenue volume. This is a documented swap-in path for when they don't, not code sitting unused today.

## S3 — job photos / KYC docs archive

Today: `src/app/api/uploadthing/core.ts` handles all uploads (job photos, provider CNIC/selfie, payment proof, dispute photos) through UploadThing.

When to migrate: UploadThing's free tier (2GB) or paid tier costs stop making sense at your storage volume, or you want direct control over KYC document retention/deletion policies for compliance (see `COMPLIANCE.md`).

Swap points:
- `src/app/api/uploadthing/core.ts` — replace with an S3 presigned-URL generator (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), same 4 file router categories (jobPhotos, providerDocs, paymentProof, disputePhotos)
- `src/lib/uploadthing.ts` — the `UploadButton`/`UploadDropzone` client components would be replaced with a plain `fetch` PUT to the presigned URL
- `src/app/api/mobile/upload/route.ts` — same swap, using `PutObjectCommand` instead of `UTApi.uploadFiles`
- Every `*Url` field in the Prisma schema (`Job.photos`, `ProviderProfile.cnicUrl`, `Payment.proofImageUrl`, `Dispute.photos`, etc.) stays a plain string URL either way — no schema change needed, just what the URL points to

## SQS — notification fan-out at scale

Today: `src/lib/notify/index.ts` calls each channel adapter (Expo push, WhatsApp, SMS, email) inline via `Promise.allSettled` inside the same request that triggered the notification (e.g. `dispatchJob()` in `src/lib/dispatch.ts` notifying every eligible provider synchronously).

When to migrate: dispatch fan-out to hundreds of providers per job starts measurably slowing down the job-post API response, or you need retry/dead-letter handling for failed sends.

Swap point: `notify()` would push a message to an SQS queue instead of calling channel adapters directly; a separate worker (could be a small long-running Node process, or `ai-service` gains a queue consumer) drains the queue and calls the same `sendExpoPushChannel`/`sendWhatsappChannel`/`sendSmsChannel`/`sendEmailChannel` functions that already exist — those functions don't change, only what calls them.

## ECS — when Python services outgrow a single container

`ai-service/` already runs as its own Docker container (`docker-compose.yml`, `ai-service` profile). If LangChain agent traffic or PyTorch model serving needs to scale independently of the Next.js app, ECS Fargate is the natural next step — the Dockerfile is already there, this is a deployment-target change, not a code change.
