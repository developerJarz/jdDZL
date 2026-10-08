import { ShowcaseRoute, showcaseMetadata } from "@/components/listing/showcaseRoute";

export const generateMetadata = () => showcaseMetadata("hot-deal");

export default function Page() {
  return <ShowcaseRoute slug="hot-deal" />;
}
