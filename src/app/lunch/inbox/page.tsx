import type { Metadata } from "next";
import { LunchInboxClient } from "@/components/lunch/LunchInboxClient";
import { LUNCH_LABEL, SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${LUNCH_LABEL}收件｜${SITE_NAME}`,
  description: "組長查看午餐回報佇列並更新菜單。",
};

export default function LunchInboxPage() {
  return <LunchInboxClient />;
}
