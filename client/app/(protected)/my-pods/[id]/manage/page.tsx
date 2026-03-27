import { notFound } from "next/navigation";
import AdminPodClient, { Pod } from "@/components/pods/AdminPodClient";
import { getPod } from "@/lib/fetchers";
import { getServerUser } from "@/lib/server-auth";

async function ManagePodPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const [pod, serverUser] = await Promise.all([getPod<Pod>(id), getServerUser()]);

  if (!serverUser || serverUser.id !== pod.createdBy) notFound();

  return <AdminPodClient pod={pod} />;
}

export default ManagePodPage;
