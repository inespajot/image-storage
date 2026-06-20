import { LoginForm } from "@/components/login-form";

export default function SignInPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/20 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
