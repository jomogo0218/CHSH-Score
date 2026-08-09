import type { Metadata } from "next";
import { HallClient } from "@/components/HallClient";
import { SITE_NAME, TEACHER_ZONE_LABEL, TEACHER_ZONE_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${TEACHER_ZONE_LABEL}｜${SITE_NAME}`,
  description: TEACHER_ZONE_TAGLINE,
};

export default function HomePage() {
  return <HallClient />;
}
