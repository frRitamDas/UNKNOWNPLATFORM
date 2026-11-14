"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CircleHelp,
  FolderOpen,
  Home,
  LogOut,
  PanelLeft,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Users,
  Palette,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

export type AppView = "home" | "projects" | "avatars";

const NAV: { id: AppView; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "avatars", label: "Avatars", icon: UserRound },
];

/** Founding-offer countdown to the end of the beta window. Real clock, real date. */
const OFFER_ENDS = new Date("2026-12-01T00:00:00Z").getTime();

function useCountdown() {
  // Starts null so the server render and the first client render agree.
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(OFFER_ENDS - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (left === null) return "\u00a0";
  if (left <= 0) return "offer ended";
  const pad = (n: number) => String(n).padStart(2, "0");
  const totalMinutes = Math.floor(left / 60000);
  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${pad(hours % 24)}h left`;
  return `${pad(hours)}:${pad(totalMinutes % 60)}:${pad(Math.floor((left % 60000) / 1000))}`;
}

export function Sidebar({
  view,
  onNavigate,
  onNewProject,
  onUpgrade,
  onOffer,
  onSearch,
  onSignOut,
  userEmail,
  projectCount,
  collapsed,
  onToggleCollapsed,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onNewProject: () => void;
  onUpgrade: () => void;
  onOffer: () => void;
  onSearch: () => void;
  onSignOut: () => void;
  userEmail: string | null;
  projectCount: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const countdown = useCountdown();
  const initial = (userEmail ?? "rf").trim().charAt(0).toUpperCase();
  const workspace = userEmail ? userEmail.split("@")[0] : "Personal workspace";

  if (collapsed) {
    return (
      <aside className="hidden w-[76px] shrink-0 flex-col items-center gap-2 border-r border-white/5 bg-app-900 py-4 lg:flex">
        <button onClick={onToggleCollapsed} className="mb-2 rounded-lg p-2 text-app-400 hover:bg-white/5 hover:text-white" aria-label="Expand sidebar">
          <PanelLeft className="h-4 w-4" />
        </button>
        <Link href="/" className="mb-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-app-800 text-lg">☁</span>
        </Link>
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="grid h-9 w-9 place-items-center rounded-lg text-app-300 hover:bg-white/5 hover:text-white"
            aria-label={item.label}
          >
            <item.icon className="h-4 w-4" />
          </button>
        ))}
        <button onClick={onNewProject} className="mt-2 grid h-9 w-9 place-items-center rounded-lg bg-ember text-app-950" aria-label="New project">
          <Plus className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[264px] shrink-0 flex-col border-r border-white/5 bg-app-900 px-3 py-4 lg:flex">
      <div className="mb-4 flex items-center justify-between px-1">
        <Link href="/" aria-label="Reelforge home">
          <Logo size={26} />
        </Link>
        <button
          onClick={onToggleCollapsed}
          className="rounded-lg p-1.5 text-app-400 hover:bg-white/5 hover:text-white"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      {/* founding offer */}
      <button
        onClick={onOffer}
        className="group mb-4 w-full rounded-2xl border border-ember/50 bg-gradient-to-br from-ember/15 to-transparent p-3 text-left transition-colors hover:border-ember"
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ember/20 text-ember">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-white">Founding price · 50% off</p>
            <p className="font-mono text-[11px] tabular-nums text-ember">{countdown}</p>
          </div>
        </div>
      </button>

      <nav className="space-y-0.5">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            data-active={view === item.id}
            className="app-nav-item"
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
            {item.id === "avatars" && (
              <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-app-400">
                soon
              </span>
            )}
          </button>
        ))}
        <button onClick={onSearch} className="app-nav-item">
          <Search className="h-[18px] w-[18px]" />
          Search
        </button>
      </nav>

      <div className="my-3 h-px bg-white/5" />

      <button onClick={onNewProject} className="app-nav-item">
        <Plus className="h-[18px] w-[18px]" />
        New project
      </button>

      <div className="flex-1" />

      {/* account block */}
      <div className="rounded-2xl bg-app-850 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ember to-sky text-[13px] font-bold text-app-950">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold capitalize text-white">{workspace}</p>
            <p className="text-[10.5px] text-app-400">Free plan · beta</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10.5px] text-app-400">
            <span>{projectCount} project{projectCount === 1 ? "" : "s"}</span>
            <span>unlimited</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-ember to-ember-deep" />
          </div>
        </div>

        <button onClick={onUpgrade} className="mt-3 w-full rounded-lg bg-sky py-2 text-[12.5px] font-semibold text-app-950 hover:brightness-110">
          Upgrade
        </button>

        <div className="mt-2 space-y-0.5 border-t border-white/5 pt-2">
          <MenuRow icon={UserRound} label="Profile" onClick={onUpgrade} />
          <MenuRow icon={Users} label="Invite members" onClick={onUpgrade} />
          <MenuRow icon={Palette} label="Appearance" onClick={onUpgrade} trailing={<ChevronRight className="h-3.5 w-3.5" />} />
          <MenuRow icon={LogOut} label="Log out" onClick={onSignOut} danger />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[11px] text-app-400">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" /> All systems normal
        </span>
        <button className="rounded-lg p-1.5 text-app-400 hover:bg-white/5 hover:text-white" aria-label="Help">
          <CircleHelp className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  trailing,
  danger,
}: {
  icon: typeof Home;
  label: string;
  onClick: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[12px] transition-colors hover:bg-white/5",
        danger ? "text-app-300 hover:text-rose-signal" : "text-app-200 hover:text-white",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  );
}
