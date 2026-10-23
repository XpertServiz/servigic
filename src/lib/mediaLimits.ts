// Limits for what customers attach to a job, chosen for UploadThing's free plan (2 GB of storage in total). A job can carry one
// photo and one short video, both optional; job media is deleted 24 hours after the job ends (see jobMediaCleanup.ts), so only
// active jobs take space.
//   Photo: 4 MB is far more than a phone photo needs (the apps compress to ~0.3-1 MB).
//   Video: 30 seconds is enough to show a leak or a noise; 32 MB fits 30 s at 720p or ~15 s at 1080p on most phones.
// With ~15 MB per average job video, 2 GB holds well over 100 active jobs with video at once; new videos are paused
// automatically if storage gets close to the limit (STORAGE_GUARD_BYTES), photos still work.

export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 32 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 30;
export const MAX_JOB_PHOTOS = 1;
export const STORAGE_GUARD_BYTES = 1.7 * 1024 * 1024 * 1024;

export const mb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;
