import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-3xl font-semibold">Page not found</p>
      <p className="text-sm text-muted-foreground">The page you were looking for doesn&apos;t exist.</p>
      <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
    </main>
  );
}
