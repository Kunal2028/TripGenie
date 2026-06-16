import { Link, useLocation } from "react-router-dom";
import { Compass, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const loc = useLocation();
  const { user, signedIn, signOut } = useAuth();
  const initial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();
  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-40 backdrop-blur-xl bg-[#f9f8f6]/80 border-b border-[#e5e4e2]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link
          to="/"
          data-testid="logo-link"
          className="flex items-center gap-2 group"
        >
          <span className="w-9 h-9 rounded-full bg-[#1A2F24] text-white grid place-items-center">
            <Compass size={18} weight="duotone" />
          </span>
          <div>
            <div className="font-display font-bold text-[17px] leading-none text-[#1A2F24]">
              TripGenie
            </div>
            <div className="label-eyebrow mt-1">multi-agent ai</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            data-testid="nav-plan"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              loc.pathname === "/"
                ? "bg-[#1A2F24] text-white"
                : "text-[#5C6B62] hover:bg-white"
            }`}
          >
            Plan
          </Link>
          <Link
            to="/trips"
            data-testid="nav-saved"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              loc.pathname === "/trips"
                ? "bg-[#1A2F24] text-white"
                : "text-[#5C6B62] hover:bg-white"
            }`}
          >
            Saved Trips
          </Link>
          {signedIn ? (
            <div className="relative ml-2 group" data-testid="user-menu">
              <button
                type="button"
                data-testid="user-avatar-button"
                className="w-10 h-10 rounded-full bg-[#E27D60] text-white grid place-items-center font-display font-bold shadow-[0_8px_22px_rgba(226,125,96,0.22)] ring-2 ring-white"
                aria-label="Account menu"
              >
                {initial}
              </button>
              <div className="absolute right-0 top-12 w-64 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:translate-y-0 focus-within:pointer-events-auto transition-all duration-200 z-50">
                <div className="rounded-2xl border border-[#e5e4e2] bg-white p-2 shadow-[0_20px_50px_rgba(26,47,36,0.12)]">
                  <div className="px-3 py-3 border-b border-[#f0efed]">
                    <div className="font-display font-medium text-[#1A2F24] truncate">
                      {user?.name || "TripGenie user"}
                    </div>
                    <div className="text-xs text-[#5C6B62] truncate mt-0.5">
                      {user?.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    data-testid="nav-sign-out"
                    className="mt-2 w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[#5C6B62] hover:bg-[#f9f8f6] hover:text-[#D9534F] transition-colors"
                  >
                    <SignOut size={16} weight="duotone" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/auth"
              data-testid="nav-sign-in"
              className={`ml-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                loc.pathname === "/auth"
                  ? "bg-[#1A2F24] text-white"
                  : "text-[#5C6B62] hover:bg-white"
              }`}
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
