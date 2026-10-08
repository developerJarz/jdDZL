import { Suspense } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
export default function LoginPage() {
  // AdminLogin reads ?error= from the URL, which needs a Suspense boundary when prerendered.
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
