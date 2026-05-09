"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Redirect logged-in users away from /login
  // If session is invalid (user deleted), sign out cleanly
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (!session.user.id) {
        // Session is invalidated (user was deleted) — sign out
        signOut({ redirect: false }).then(() => router.replace("/login"));
        return;
      }
      if (!session.user.hasWedding) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [status, session, router]);

  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsError, setTermsError] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = !confirmPassword || !password || password === confirmPassword;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setTermsError(false);

    if (isSignUp) {
      if (!passwordsMatch) {
        setError("Passwords do not match");
        return;
      }
      if (!agreedToTerms) {
        setTermsError(true);
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Register
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Registration failed");
          setLoading(false);
          return;
        }

        // Auto sign in after registration
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError("Account created but sign in failed. Please log in.");
          setIsSignUp(false);
          setLoading(false);
          return;
        }

        router.push("/onboarding");
      } else {
        // Login
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        router.push(callbackUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Show nothing while checking session (prevents flash)
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen linen-texture flex items-center justify-center">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel: Wedding Photo ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Image
          src="/images/wedding-hero.jpg"
          alt="Elegant wedding celebration"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 p-10 animate-fade-in delay-300">
          <p className="font-headline italic text-white/90 text-lg leading-relaxed max-w-md">
            &ldquo;Every love story deserves a masterpiece to hold it.&rdquo;
          </p>
          <p className="font-headline text-primary-container text-sm mt-3 uppercase tracking-widest">
            KnotBook
          </p>
        </div>
      </div>

      {/* ── Right Panel: Auth Form ── */}
      <div className="w-full lg:w-1/2 linen-texture flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo — links to homepage */}
          <div className="text-center mb-8">
            <a href="/" className="inline-block">
              <Image src="/images/knotbook-logo-full.png" alt="KnotBook" className="h-28 w-auto mx-auto mb-4 hover:opacity-90 transition-opacity" width={600} height={600} />
            </a>
            <p className="font-headline italic text-primary/60 text-sm mt-2">
              Your Wedding Sanctuary
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-8 animate-fade-in-up">
            <h2 className="font-headline text-2xl text-on-surface text-center mb-1">
              {isSignUp ? "Create Your Account" : "Welcome Back"}
            </h2>
            <p className="text-on-surface-variant text-sm text-center mb-8 font-label">
              {isSignUp ? "Begin planning your perfect day" : "Sign in to continue your journey"}
            </p>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-error-container/20 border border-error/20 text-error text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete={isSignUp ? "off" : "on"} className="space-y-5">
              {isSignUp && (
                <div className="animate-fade-in-up delay-100">
                  <label htmlFor="name" className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={loading}
                    className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                </div>
              )}

              <div className="animate-fade-in-up delay-200">
                <label htmlFor="email" className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>

              <div className="animate-fade-in-up delay-300">
                <label htmlFor="password" className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignUp ? "Create a password (min 8 chars)" : "Enter your password"}
                    required
                    minLength={8}
                    disabled={loading}
                    className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 pr-10 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 bottom-2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-xl" />
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="animate-fade-in-up delay-300">
                  <label htmlFor="confirmPassword" className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
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
              )}

              {!isSignUp && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        setError("Enter your email address first, then click Forgot password");
                        return;
                      }
                      setError("");
                      setLoading(true);
                      try {
                        const res = await fetch("/api/auth/forgot-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email }),
                        });
                        const data = await res.json();
                        setError(data.message || "Check your email for a reset link.");
                      } catch {
                        setError("Something went wrong. Please try again.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-primary text-xs font-label hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {isSignUp && (
                <div>
                  <div className="flex items-start gap-3">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (e.target.checked) setTermsError(false);
                      }}
                      disabled={loading}
                      className={`mt-0.5 h-4 w-4 rounded border-outline-variant text-primary accent-primary-container cursor-pointer ${termsError ? "ring-2 ring-error/50" : ""}`}
                    />
                    <label htmlFor="terms" className="text-on-surface-variant text-xs leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">Terms of Service</Link>
                      {" "}and{" "}
                      <Link href="/privacy" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">Privacy Policy</Link>
                    </label>
                  </div>
                  {termsError && (
                    <p className="text-error text-xs mt-1.5 ml-7 font-label">
                      You must agree to the Terms of Service and Privacy Policy
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full gold-gradient text-on-primary font-label text-sm uppercase tracking-widest py-3.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover-glow animate-fade-in-up delay-400 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && (
                  <Icon name="progress_activity" className="text-lg animate-spin" />
                )}
                {loading
                  ? isSignUp ? "Creating Account..." : "Signing In..."
                  : isSignUp ? "Create Account" : "Sign In"
                }
              </button>
            </form>
          </div>

          <p className="text-center text-on-surface-variant text-sm font-label mt-6">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(""); setConfirmPassword(""); }}
                  className="text-primary font-medium hover:underline underline-offset-2 cursor-pointer"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(""); }}
                  className="text-primary font-medium hover:underline underline-offset-2 cursor-pointer"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
