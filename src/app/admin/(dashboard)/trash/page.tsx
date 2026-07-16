import { TrashManager } from "@/components/admin/trash-manager";
import { getTrashItems } from "@/lib/queries/cms";

export default async function AdminTrashPage() {
  const items = await getTrashItems();
  return <TrashManager items={items} />;
}
