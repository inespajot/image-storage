import { ImageIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="border-b bg-background/95">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ImageIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="truncate">Private Image Vault</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/protected">Open vault</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
