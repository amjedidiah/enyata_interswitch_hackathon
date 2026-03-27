import Link from "next/link";

function PodAdminLink({
  podId,
  createdBy,
  userId,
}: Readonly<{ podId: string; createdBy?: string; userId: string | null }>) {
  if (!userId || !createdBy || userId !== createdBy) {
    return null;
  }

  return (
    <p className="text-center text-xs text-brand-muted">
      <Link
        href={`/my-pods/${podId}/manage`}
        className="text-brand-primary underline underline-offset-2"
      >
        Manage Pod →
      </Link>
    </p>
  );
}

export default PodAdminLink;
