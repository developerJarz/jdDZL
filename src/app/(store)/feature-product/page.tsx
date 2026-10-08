import { ShowcaseRoute, showcaseMetadata } from "@/components/listing/showcaseRoute";

export const generateMetadata = () => showcaseMetadata("feature-product");

export default function Page() {
  return <ShowcaseRoute slug="feature-product" />;
}
