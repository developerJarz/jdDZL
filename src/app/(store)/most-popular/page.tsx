import { ShowcaseRoute, showcaseMetadata } from "@/components/listing/showcaseRoute";

export const generateMetadata = () => showcaseMetadata("most-popular");

export default function Page() {
  return <ShowcaseRoute slug="most-popular" />;
}
