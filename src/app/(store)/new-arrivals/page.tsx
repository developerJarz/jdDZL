import { ShowcaseRoute, showcaseMetadata } from "@/components/listing/showcaseRoute";

export const generateMetadata = () => showcaseMetadata("new-arrivals");

export default function Page() {
  return <ShowcaseRoute slug="new-arrivals" />;
}
