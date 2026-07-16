import { ContentManagementView } from "@/components/admin/content-management-view";
import { getAdminContentStrings } from "@/lib/queries/content";

export default async function ContentManagementPage() {
  const initial = await getAdminContentStrings();
  return <ContentManagementView initial={initial} />;
}
