import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { EnvelopeSimple, Lock, User, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { login, signup } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthPage() {
  const nav = useNavigate();
  const { completeAuth, signedIn } = useAuth();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (signedIn) nav("/");
  }, [signedIn, nav]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const action = mode === "signup" ? signup : login;
      const data = await action(form);
      completeAuth(data);
      toast.success(mode === "signup" ? "Account created" : "Welcome back");
      nav("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main data-testid="auth-page" className="max-w-6xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <section>
          <div className="label-eyebrow mb-4">tripgenie account</div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-[#1A2F24] tracking-tighter">
            Save every plan behind your own login.
          </h1>
          <p className="mt-5 text-[#5C6B62] leading-relaxed max-w-xl">
            Sign in to keep trip drafts, completed itineraries, budgets, hotels, and recommendations attached to your account.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["Private trips", "Email login", "Saved history"].map((item) => (
              <div key={item} className="tg-card !p-4">
                <div className="font-display font-medium text-[#1A2F24]">{item}</div>
              </div>
            ))}
          </div>
        </section>

        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="tg-card !p-6 sm:!p-8"
          data-testid="auth-form"
        >
          <div className="flex rounded-full bg-[#f9f8f6] p-1">
            {["login", "signup"].map((item) => (
              <button
                key={item}
                type="button"
                data-testid={`auth-mode-${item}`}
                onClick={() => setMode(item)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  mode === item ? "bg-[#1A2F24] text-white" : "text-[#5C6B62]"
                }`}
              >
                {item === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field icon={User} label="Name">
                <input
                  type="text"
                  data-testid="auth-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                />
              </Field>
            )}
            <Field icon={EnvelopeSimple} label="Email">
              <input
                type="email"
                data-testid="auth-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </Field>
            <Field icon={Lock} label="Password">
              <input
                type="password"
                data-testid="auth-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-6 inline-flex items-center justify-center gap-2 disabled:opacity-60"
            data-testid="auth-submit"
          >
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
            <ArrowRight size={18} weight="bold" />
          </button>

          <p className="mt-5 text-xs text-[#5C6B62] leading-relaxed">
            Your saved trips are tied to this account and kept private from other users.
          </p>
        </motion.form>
      </div>
    </main>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <div className="label-eyebrow flex items-center gap-2 mb-2">
        <Icon size={12} weight="bold" /> {label}
      </div>
      {children}
    </label>
  );
}
