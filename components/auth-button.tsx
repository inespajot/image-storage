import Link from "next/link";
import { Images } from "lucide-react";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button asChild size="sm" variant="ghost">
        <Link href="/protected">
          <Images />
          <span className="hidden sm:inline">My vault</span>
        </Link>
      </Button>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-1 sm:gap-2">
      <Button asChild size="sm" variant="ghost">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
