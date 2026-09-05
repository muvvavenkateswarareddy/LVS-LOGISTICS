"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { signIn } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/utils";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, null as { error?: string } | null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-md bg-primary p-1.5 text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </div>

        {!process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Supabase environment variables are missing on this deployment. Set
            NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Fleet compliance for your whole yard, in one view.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {state?.error ? (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
              ) : null}
              <Button type="submit" className="w-full" loading={pending}>Sign in</Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New here? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
