import { ArrowRight, Images, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Home() {
  let isLoggedIn = false;

  if (hasEnvVars) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    isLoggedIn = Boolean(data?.claims);
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <AppHeader />

      <main className="flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm">
              <ShieldCheck className="size-4 text-foreground" />
              Private storage for your account
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your images, stored privately.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              Private Image Vault gives you a simple place to upload, view, and
              manage your images. Every file is protected and isolated to your
              signed-in account.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isLoggedIn ? (
                <Button asChild size="lg">
                  <Link href="/protected">
                    Open my vault
                    <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/auth/sign-up">
                      Create an account
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <LockKeyhole className="size-4" />
              Signed URLs keep your stored images private.
            </p>
          </section>

          <section
            className="relative mx-auto w-full max-w-xl"
            aria-label="Private Image Vault preview"
          >
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-muted blur-2xl" />
            <div className="overflow-hidden rounded-2xl border bg-background shadow-xl shadow-foreground/5">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <p className="font-semibold">My vault</p>
                  <p className="text-xs text-muted-foreground">
                    Private to your account
                  </p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Images className="size-4" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
                {[
                  "bg-zinc-200 dark:bg-zinc-800",
                  "bg-stone-300 dark:bg-stone-700",
                  "bg-neutral-200 dark:bg-neutral-800",
                  "bg-slate-300 dark:bg-slate-700",
                  "bg-gray-200 dark:bg-gray-800",
                  "bg-zinc-300 dark:bg-zinc-700",
                ].map((color, index) => (
                  <div
                    key={color}
                    className={`aspect-square rounded-xl ${color} ${
                      index > 3 ? "hidden sm:block" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <p>Private Image Vault</p>
          <p>Your files stay tied to your account.</p>
        </div>
      </footer>
    </div>
  );
}
