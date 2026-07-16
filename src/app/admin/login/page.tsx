import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/config";

export default function AdminLoginRedirectPage() {
  redirect(LOGIN_PATH);
}
