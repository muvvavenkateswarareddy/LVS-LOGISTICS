"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong"
        description={error.message || "We couldn't load this page. Please try again."}
        action={<Button onClick={reset}>Try again</Button>}
      />
    </Card>
  );
}
