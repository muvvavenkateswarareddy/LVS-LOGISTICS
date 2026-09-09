import Link from "next/link";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { getSession } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Join fleet" };
export const dynamic = "force-dynamic";

/**
 * Accepting an invite. Signing up with the invited email joins automatically
 * (database trigger); this page covers people who already have an account.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // redirects to /login?next=/invite/... when signed out
  const { supabase } = await getSession();

  const { error } = await supabase.rpc("accept_fleet_invite", { p_token: token });
  if (!error) redirect("/dashboard");

  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState
        icon={XCircle}
        title="This invite can't be used"
        description={error.message}
        action={<Button asChild><Link href="/dashboard">Go to dashboard</Link></Button>}
      />
    </Card>
  );
}
