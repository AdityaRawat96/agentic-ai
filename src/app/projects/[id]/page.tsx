import { ProjectErrors } from "@/components/ProjectErrors";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8">
      <ProjectErrors projectId={params.id} />
    </div>
  );
}
