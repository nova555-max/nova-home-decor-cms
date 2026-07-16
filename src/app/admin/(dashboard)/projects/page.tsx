import { ProjectsManager } from "@/components/admin/projects-manager";
import { getAdminProjects } from "@/lib/queries/cms";

export default async function AdminProjectsPage() {
  const projects = await getAdminProjects();
  return <ProjectsManager projects={projects} />;
}
