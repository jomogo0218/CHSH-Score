import type { Metadata } from "next";
import { LunchBoard } from "@/components/lunch/LunchBoard";
import { LUNCH_LABEL, SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${LUNCH_LABEL}佈告欄｜${SITE_NAME}`,
  description: "導師查看今日午餐菜單佈告，必要時回報本班狀況。",
};

export default function LunchPage() {
  return <LunchBoard />;
}
