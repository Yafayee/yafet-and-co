import { Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-8">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
          <span className="brand-text font-[family-name:var(--font-display)] text-2xl font-bold">CP Consulting</span>
        </div>
        <h1 className="mt-6 text-center text-xl font-bold text-white">Sign in to the CRM</h1>
        <p className="mt-1 text-center text-sm text-mute">Customer relationships, in one secure place.</p>
        <form className="mt-6 space-y-4">
          <label className="block"><span className="label">Email</span><input type="email" className="input mt-1" placeholder="you@cpconsulting.at" autoComplete="username" /></label>
          <label className="block"><span className="label">Password</span><input type="password" className="input mt-1" autoComplete="current-password" /></label>
          <Link href="/" className="btn btn-primary w-full"><Lock className="h-4 w-4" /> Sign in</Link>
        </form>
        <p className="mt-5 text-center text-xs text-mute">Preview: sign-in is not connected yet, the button opens the dashboard.</p>
      </div>
    </main>
  );
}
