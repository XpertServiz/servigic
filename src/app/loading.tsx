import { getTranslations } from "next-intl/server";
import { PageLoader } from "@/components/brand/PageLoader";

export default async function Loading() {
  const t = await getTranslations("common");
  return <PageLoader label={t("loading")} />;
}
