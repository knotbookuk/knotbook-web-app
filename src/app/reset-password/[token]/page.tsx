"use client";

import { useState, FormEvent, use } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Image from "next/image";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordsMatch = !confirmPassword || !password || password === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen linen-texture flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/images/knotbook-logo-full.png" alt="KnotBook" className="h-28 w-auto mx-auto mb-4" width={600} height={600} />
        </div>

        <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-8 animate-fade-in-up">
          {success ? (
            <div className="text-center">
              <Icon name="check_circle" className="text-green-600 text-5xl mb-4 block" />
              <h2 className="font-headline text-2xl text-on-surface mb-2">Password Reset!</h2>
              <p className="text-on-surface-variant text-sm">Your password has been changed successfully. Redirecting to login...</p>
            </div>
          ) : (
            <>
              <h2 className="font-headline text-2xl text-on-surface text-center mb-1">Reset Password</h2>
              <p className="text-on-surface-variant text-sm text-center mb-8">Enter your new password below</p>

              {error && (
                <div className="mb-6 p-3 rounded-xl bg-error-container/20 border border-error/20 text-error text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="password" className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      disabled={loading}
                      className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 pr-10 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 bottom-2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-xl" />
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                    disabled={loading}
                    className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                  {!passwordsMatch && (
                    <p className="text-error text-xs mt-1.5 font-label">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!passwordsMatch || loading}
                  className="w-full gold-gradient text-on-primary font-label text-sm uppercase tracking-widest py-3.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover-glow flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading && <Icon name="progress_activity" className="text-lg animate-spin" />}
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
