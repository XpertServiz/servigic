import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  jobPhotos: f({ image: { maxFileSize: "4MB", maxFileCount: 6 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "CUSTOMER") throw new Error("Unauthorized");
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
