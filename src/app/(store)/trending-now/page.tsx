import { ShowcaseRoute, showcaseMetadata } from "@/components/listing/showcaseRoute";

export const generateMetadata = () => showcaseMetadata("trending-now");

export default function Page() {
  return <ShowcaseRoute slug="trending-now" />;
}
