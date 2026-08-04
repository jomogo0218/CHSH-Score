import type { Metadata } from "next";
import { RecycleGuide } from "@/components/RecycleGuide";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `資源回收分類｜${SITE_NAME}`,
  description: "嘉華中學體衛組資源回收分類提醒與分類寶典。",
};

export default function RecyclePage() {
  return <RecycleGuide />;
}
