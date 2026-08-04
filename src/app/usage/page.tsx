import type { Metadata } from "next";
import { UsageDashboard } from "@/components/UsageDashboard";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `免費額度進度｜${SITE_NAME}`,
  description: "查看照片儲存、網站流量與 Firebase 免費額度進度。",
};

export default function UsagePage() {
  return <UsageDashboard />;
}
