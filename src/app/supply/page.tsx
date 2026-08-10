import type { Metadata } from "next";
import { SupplyClient } from "@/components/SupplyClient";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `學務處領用｜${SITE_NAME}`,
  description: "申請刷洗廁所清潔劑、小垃圾桶塑膠袋、洗手台肥皂，至學務處領取。",
};

export default function SupplyPage() {
  return <SupplyClient />;
}
