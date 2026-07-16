import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/config";

export default async function CreateAdministratorPage() {
  redirect(LOGIN_PATH);
}
