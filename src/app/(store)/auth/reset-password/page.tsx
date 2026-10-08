import { ResetPassword } from "@/components/auth/ResetPassword";
export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ResetPassword />;
}
