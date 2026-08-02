import { LiveBoard } from "@/components/LiveBoard";
import { getLatestFeed } from "@/lib/seed/demo-data";

export default function BoardPage() {
  return <LiveBoard items={getLatestFeed()} />;
}
