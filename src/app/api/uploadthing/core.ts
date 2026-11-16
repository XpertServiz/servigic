import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";
import { storedBytes } from "@/lib/directUpload";
import { STORAGE_GUARD_BYTES } from "@/lib/mediaLimits";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { bigProjectsEnabled } from "@/lib/bigProjects";

const f = createUploadthing();

export const ourFileRouter = {
  // Big Projects request form (no account needed): up to 5 photos and 1 PDF plan. Limited per connection and paused when storage is nearly full.
  projectFiles: f({ image: { maxFileSize: "4MB", maxFileCount: 5 }, pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      if (!bigProjectsEnabled()) throw new Error("Unavailable");
      const hit = await checkRateLimit(`projfiles:${clientKey(req)}`, 12, 3600);
      if (!hit.ok) throw new Error("Too many uploads. Please try again later.");
      const used = await storedBytes();
      if (used !== null && used > STORAGE_GUARD_BYTES) throw new Error("Uploads are paused for a while. You can send files on the call instead.");
      return {};
    })
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),

  jobPhotos: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "CUSTOMER") throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { userId: metadata.userId, url: file.ufsUrl };
    }),

  // One short video of the problem (optional). See src/lib/mediaLimits.ts for the limits and why.
  jobVideo: f({ video: { maxFileSize: "32MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "CUSTOMER") throw new Error("Unauthorized");
      const used = await storedBytes();
      if (used !== null && used > STORAGE_GUARD_BYTES) throw new Error("Video uploads are paused for a while. Please add a photo instead.");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { userId: metadata.userId, url: file.ufsUrl };
    }),

  providerDocs: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "PROVIDER") throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { userId: metadata.userId, url: file.ufsUrl };
    }),

  paymentProof: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "CUSTOMER") throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { userId: metadata.userId, url: file.ufsUrl };
    }),

  disputePhotos: f({ image: { maxFileSize: "4MB", maxFileCount: 6 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { userId: metadata.userId, url: file.ufsUrl };
    }),

  // Provider-side change-order proof photo — was previously (wrongly)
  // uploaded through jobPhotos, whose middleware only allows CUSTOMER,
  // so every provider upload threw "Unauthorized" in the middleware.
  changeOrderPhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "PROVIDER") throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { userId: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
