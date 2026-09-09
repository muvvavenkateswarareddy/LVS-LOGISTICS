"use client";
import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signUp } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/utils";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    signUp,
    null as { error?: string; message?: string } | null,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-1">
          <Image src="/logo.png" alt={APP_NAME} width={220} height={192} priority className="h-auto w-[200px]" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Your fleet and its default document types are set up automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Your name</Label>
                <Input id="full_name" name="full_name" autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fleet_name">Fleet name</Label>
                <Input id="fleet_name" name="fleet_name" placeholder="LVS Logistics" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              {state?.error ? (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
              ) : null}
              {state?.message ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p>
              ) : null}
              <Button type="submit" className="w-full" loading={pending}>Create account</Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
