"use client";

import {
  motion,
  useAnimation,
  AnimatePresence,
  type Variants,
  type MotionProps,
} from "framer-motion";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  BellOff,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarCheck,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  Crown,
  Edit,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  HeartHandshake,
  ImagePlus,
  List,
  Loader2,
  Lock,
  LockOpen,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Package,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Heart,
  Sparkles,
  Star,
  Store,
  Moon,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  UploadCloud,
  UserRound,
  Wallet,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// ─── Spring configs ───────────────────────────────────────────────────────────
const snap    = { type: "spring", stiffness: 500, damping: 28 } as const;
const soft    = { type: "spring", stiffness: 300, damping: 22 } as const;
const bouncy  = { type: "spring", stiffness: 420, damping: 16 } as const;

// ─── Shared hover/tap for every icon ─────────────────────────────────────────
const iconMotion: MotionProps = {
  whileHover: { scale: 1.18 },
  whileTap:   { scale: 0.84 },
  transition: snap,
};

// ─── Generic animated wrapper ─────────────────────────────────────────────────
export function AnimatedIcon({
  icon: Icon,
  size = 20,
  color,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <motion.span
      {...iconMotion}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      className={className}
    >
      <Icon size={size} color={color} />
    </motion.span>
  );
}

// ─── Bell — rings on new notifications + periodic nudge while unread ─────────
export function AnimatedBell({
  size = 20,
  color,
  active = false,
  muted = false,
}: {
  size?: number;
  color?: string;
  active?: boolean;
  muted?: boolean;
}) {
  const ctrl = useAnimation();
  const prev = useRef(active);

  // One-shot ring when new notifications arrive
  useEffect(() => {
    if (active && !prev.current) {
      ctrl.start({
        rotate: [0, -22, 22, -16, 16, -10, 10, -5, 5, 0],
        transition: { duration: 0.75, ease: "easeInOut" },
      });
    }
    prev.current = active;
  }, [active, ctrl]);

  // Periodic gentle nudge every 4 s while there are unread items
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      ctrl.start({
        rotate: [0, -10, 10, -6, 6, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      });
    }, 4000);
    return () => clearInterval(id);
  }, [active, ctrl]);

  if (muted) {
    return (
      <motion.span {...iconMotion} style={{ display: "inline-flex" }}>
        <BellOff size={size} color={color} />
      </motion.span>
    );
  }

  return (
    <motion.span
      animate={ctrl}
      whileHover={{ scale: 1.15, rotate: -10 }}
      whileTap={{ scale: 0.85 }}
      transition={snap}
      style={{ display: "inline-flex", transformOrigin: "top center" }}
    >
      <Bell size={size} color={color} />
    </motion.span>
  );
}

// ─── Menu / X — morphs on toggle ─────────────────────────────────────────────
export function AnimatedMenu({
  open,
  size = 20,
  color,
}: {
  open: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      key={open ? "x" : "menu"}
      initial={{ rotate: open ? -90 : 90, opacity: 0, scale: 0.6 }}
      animate={{ rotate: 0,             opacity: 1, scale: 1   }}
      exit={{    rotate: open ? 90 : -90, opacity: 0, scale: 0.6 }}
      transition={snap}
      style={{ display: "inline-flex" }}
    >
      {open ? <X size={size} color={color} /> : <Menu size={size} color={color} />}
    </motion.span>
  );
}

// ─── Copy / Check — morphs to checkmark on copy ───────────────────────────────
export function AnimatedCopy({
  copied,
  size = 16,
  color,
}: {
  copied: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      key={copied ? "check" : "copy"}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1,   opacity: 1 }}
      transition={bouncy}
      style={{ display: "inline-flex" }}
    >
      {copied
        ? <Check size={size} color={color ?? "#7FB685"} />
        : <Copy  size={size} color={color} />
      }
    </motion.span>
  );
}

// ─── Bookmark — fills on save ─────────────────────────────────────────────────
export function AnimatedBookmark({
  saved,
  size = 18,
  color,
  savedColor = "#C68B59",
}: {
  saved: boolean;
  size?: number;
  color?: string;
  savedColor?: string;
}) {
  return (
    <motion.span
      animate={saved ? { scale: [1, 1.35, 0.9, 1.1, 1] } : { scale: 1 }}
      transition={saved ? { duration: 0.45 } : snap}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.82 }}
      style={{ display: "inline-flex" }}
    >
      {saved
        ? <BookmarkCheck size={size} color={savedColor} fill={savedColor} />
        : <Bookmark      size={size} color={color} />
      }
    </motion.span>
  );
}

// ─── Star — fills on rate ─────────────────────────────────────────────────────
export function AnimatedStar({
  active,
  size = 16,
  color,
  activeColor = "#C68B59",
}: {
  active?: boolean;
  size?: number;
  color?: string;
  activeColor?: string;
}) {
  return (
    <motion.span
      animate={active ? { scale: [1, 1.4, 0.85, 1.12, 1] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.2, rotate: 15 }}
      whileTap={{ scale: 0.8 }}
      style={{ display: "inline-flex" }}
    >
      <Star
        size={size}
        color={active ? activeColor : color}
        fill={active ? activeColor : "none"}
      />
    </motion.span>
  );
}

// ─── Trash — danger shake on hover ───────────────────────────────────────────
export function AnimatedTrash({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{
        rotate:     [0, -12, 12, -8, 8, -4, 4, 0],
        transition: { duration: 0.5 },
      }}
      whileTap={{ scale: 0.82 }}
      style={{ display: "inline-flex" }}
    >
      <Trash2 size={size} color={color} />
    </motion.span>
  );
}

// ─── Settings / Gear — rotates on hover ───────────────────────────────────────
export function AnimatedSettings({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ rotate: 90,  scale: 1.1, transition: soft }}
      whileTap={{   rotate: 180, scale: 0.9, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Settings size={size} color={color} />
    </motion.span>
  );
}

// ─── LogOut — slides right on hover ───────────────────────────────────────────
export function AnimatedLogOut({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ x: 3, scale: 1.1, transition: soft }}
      whileTap={{   x: 6, scale: 0.9, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <LogOut size={size} color={color} />
    </motion.span>
  );
}

// ─── Send — launches on tap ───────────────────────────────────────────────────
export function AnimatedSend({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ x: 2,  y: -2, scale: 1.15, transition: soft }}
      whileTap={{   x: 6,  y: -6, scale: 0.8,  transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Send size={size} color={color} />
    </motion.span>
  );
}

// ─── Search — magnify pulse ───────────────────────────────────────────────────
export function AnimatedSearch({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.2,  rotate: -8, transition: soft }}
      whileTap={{   scale: 0.88, rotate: 0,  transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Search size={size} color={color} />
    </motion.span>
  );
}

// ─── ShoppingBag — bounce on hover ───────────────────────────────────────────
export function AnimatedShoppingBag({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ y: -3, scale: 1.12, transition: bouncy }}
      whileTap={{   y: 1,  scale: 0.88, transition: snap   }}
      style={{ display: "inline-flex" }}
    >
      <ShoppingBag size={size} color={color} />
    </motion.span>
  );
}

// ─── Wallet — spring bounce ───────────────────────────────────────────────────
export function AnimatedWallet({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ scale: [1, 1.2, 0.95, 1.1, 1], transition: { duration: 0.4 } }}
      whileTap={{ scale: 0.85, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Wallet size={size} color={color} />
    </motion.span>
  );
}

// ─── Zap — flash pulse ────────────────────────────────────────────────────────
export function AnimatedZap({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{
        scale:      [1, 1.3, 0.9, 1.2, 1],
        filter:     "drop-shadow(0 0 6px currentColor)",
        transition: { duration: 0.35 },
      }}
      whileTap={{ scale: 0.8, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Zap size={size} color={color} />
    </motion.span>
  );
}

// ─── Crown — royal spring ─────────────────────────────────────────────────────
export function AnimatedCrown({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ y: -3, rotate: -5, scale: 1.15, transition: bouncy }}
      whileTap={{   y: 0,  rotate: 0,  scale: 0.85, transition: snap   }}
      style={{ display: "inline-flex" }}
    >
      <Crown size={size} color={color} />
    </motion.span>
  );
}

// ─── Plus — rotates to X when open ───────────────────────────────────────────
export function AnimatedPlus({
  open = false,
  size = 16,
  color,
}: {
  open?: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      animate={{ rotate: open ? 45 : 0, scale: open ? 1.1 : 1 }}
      transition={snap}
      whileHover={{ scale: open ? 1.1 : 1.18 }}
      whileTap={{ scale: 0.82 }}
      style={{ display: "inline-flex" }}
    >
      <Plus size={size} color={color} />
    </motion.span>
  );
}

// ─── ChevronDown — rotates open/close ────────────────────────────────────────
export function AnimatedChevron({
  open = false,
  size = 16,
  color,
  direction = "down",
}: {
  open?: boolean;
  size?: number;
  color?: string;
  direction?: "down" | "right";
}) {
  return (
    <motion.span
      animate={{ rotate: open ? (direction === "down" ? 180 : 90) : 0 }}
      transition={soft}
      whileTap={{ scale: 0.88 }}
      style={{ display: "inline-flex" }}
    >
      {direction === "right"
        ? <ChevronRight size={size} color={color} />
        : <ChevronDown  size={size} color={color} />
      }
    </motion.span>
  );
}

// ─── Lock — unlocks on toggle ─────────────────────────────────────────────────
export function AnimatedLock({
  locked = true,
  size = 16,
  color,
}: {
  locked?: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      key={locked ? "locked" : "open"}
      initial={{ scale: 0.6, opacity: 0, y: locked ? 4 : -4 }}
      animate={{ scale: 1,   opacity: 1, y: 0              }}
      transition={bouncy}
      whileHover={{ scale: 1.15, rotate: locked ? -5 : 5 }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      {locked
        ? <Lock     size={size} color={color} />
        : <LockOpen size={size} color={color} />
      }
    </motion.span>
  );
}

// ─── Eye — show/hide toggle ───────────────────────────────────────────────────
export function AnimatedEye({
  visible = true,
  size = 16,
  color,
}: {
  visible?: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      key={visible ? "eye" : "eye-off"}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1,   opacity: 1 }}
      transition={snap}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      {visible ? <Eye size={size} color={color} /> : <EyeOff size={size} color={color} />}
    </motion.span>
  );
}

// ─── Loader — continuous spin ─────────────────────────────────────────────────
export function AnimatedLoader({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      style={{ display: "inline-flex" }}
    >
      <Loader2 size={size} color={color} />
    </motion.span>
  );
}

// ─── RefreshCw — spins on hover ───────────────────────────────────────────────
export function AnimatedRefresh({
  size = 16,
  color,
  spinning = false,
}: {
  size?: number;
  color?: string;
  spinning?: boolean;
}) {
  return (
    <motion.span
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={spinning ? { duration: 0.8, repeat: Infinity, ease: "linear" } : soft}
      whileHover={!spinning ? { rotate: 360, transition: { duration: 0.5 } } : undefined}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <RefreshCw size={size} color={color} />
    </motion.span>
  );
}

// ─── Shield — pulse glow on admin ─────────────────────────────────────────────
export function AnimatedShield({
  size = 16,
  color,
  check = false,
}: {
  size?: number;
  color?: string;
  check?: boolean;
}) {
  return (
    <motion.span
      whileHover={{
        scale:      1.15,
        filter:     "drop-shadow(0 0 5px currentColor)",
        transition: soft,
      }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      {check ? <ShieldCheck size={size} color={color} /> : <Shield size={size} color={color} />}
    </motion.span>
  );
}

// ─── Globe — rotates on hover ─────────────────────────────────────────────────
export function AnimatedGlobe({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ rotate: 20,  scale: 1.12, transition: soft }}
      whileTap={{   rotate: -10, scale: 0.88, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Globe size={size} color={color} />
    </motion.span>
  );
}

// ─── MapPin — drops on hover ──────────────────────────────────────────────────
export function AnimatedMapPin({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ y: -3, scale: 1.2, transition: bouncy }}
      whileTap={{   y: 2,  scale: 0.8, transition: snap   }}
      style={{ display: "inline-flex" }}
    >
      <MapPin size={size} color={color} />
    </motion.span>
  );
}

// ─── UploadCloud — rises on hover ─────────────────────────────────────────────
export function AnimatedUploadCloud({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ y: -4, scale: 1.15, transition: bouncy }}
      whileTap={{   y: 2,  scale: 0.88, transition: snap   }}
      style={{ display: "inline-flex" }}
    >
      <UploadCloud size={size} color={color} />
    </motion.span>
  );
}

// ─── TrendingUp — rises on hover ──────────────────────────────────────────────
export function AnimatedTrendingUp({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{
        y:          -4,
        x:          2,
        scale:      1.15,
        transition: bouncy,
      }}
      whileTap={{ scale: 0.85, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <TrendingUp size={size} color={color} />
    </motion.span>
  );
}

// ─── ArrowRight — slides right ────────────────────────────────────────────────
export function AnimatedArrowRight({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ x: 3, scale: 1.1, transition: soft }}
      whileTap={{   x: 6, scale: 0.9, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <ArrowRight size={size} color={color} />
    </motion.span>
  );
}

// ─── ArrowLeft — slides left ──────────────────────────────────────────────────
export function AnimatedArrowLeft({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ x: -3, scale: 1.1, transition: soft }}
      whileTap={{   x: -6, scale: 0.9, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <ArrowLeft size={size} color={color} />
    </motion.span>
  );
}

// ─── UserRound — subtle spring ────────────────────────────────────────────────
export function AnimatedUser({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.2, y: -1, transition: bouncy }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <UserRound size={size} color={color} />
    </motion.span>
  );
}

// ─── MessageSquare — ping on hover ────────────────────────────────────────────
export function AnimatedMessage({
  size = 16,
  color,
  circle = false,
}: {
  size?: number;
  color?: string;
  circle?: boolean;
}) {
  return (
    <motion.span
      whileHover={{
        scale:      [1, 1.18, 0.92, 1.08, 1],
        transition: { duration: 0.35 },
      }}
      whileTap={{ scale: 0.82 }}
      style={{ display: "inline-flex" }}
    >
      {circle
        ? <MessageCircle  size={size} color={color} />
        : <MessageSquare size={size} color={color} />
      }
    </motion.span>
  );
}

// ─── Palette — rotates on hover ───────────────────────────────────────────────
export function AnimatedPalette({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ rotate: -15, scale: 1.15, transition: soft }}
      whileTap={{   rotate: 15,  scale: 0.88, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Palette size={size} color={color} />
    </motion.span>
  );
}

// ─── Sparkles — sparkle burst ─────────────────────────────────────────────────
export function AnimatedSparkles({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{
        scale:      [1, 1.3, 0.9, 1.2, 1],
        rotate:     [0, 15, -10, 8, 0],
        filter:     "drop-shadow(0 0 4px currentColor)",
        transition: { duration: 0.45 },
      }}
      whileTap={{ scale: 0.82 }}
      style={{ display: "inline-flex" }}
    >
      <Sparkles size={size} color={color} />
    </motion.span>
  );
}

// ─── Pencil / Edit — wiggle on hover ─────────────────────────────────────────
export function AnimatedPencil({
  size = 16,
  color,
  useEdit = false,
}: {
  size?: number;
  color?: string;
  useEdit?: boolean;
}) {
  return (
    <motion.span
      whileHover={{
        rotate:     [0, -8, 8, -4, 4, 0],
        transition: { duration: 0.4 },
      }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      {useEdit ? <Edit size={size} color={color} /> : <Pencil size={size} color={color} />}
    </motion.span>
  );
}

// ─── Tag — spring flip ────────────────────────────────────────────────────────
export function AnimatedTag({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ rotate: -15, scale: 1.15, transition: soft }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <Tag size={size} color={color} />
    </motion.span>
  );
}

// ─── Package — bounce on hover ────────────────────────────────────────────────
export function AnimatedPackage({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ y: -3, scale: 1.12, transition: bouncy }}
      whileTap={{ y: 2, scale: 0.88, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Package size={size} color={color} />
    </motion.span>
  );
}

// ─── Share2 — fan out on hover ────────────────────────────────────────────────
export function AnimatedShare({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.2, x: 2, y: -2, transition: soft }}
      whileTap={{ scale: 0.82, transition: snap }}
      style={{ display: "inline-flex" }}
    >
      <Share2 size={size} color={color} />
    </motion.span>
  );
}

// ─── Store — spring bounce ────────────────────────────────────────────────────
export function AnimatedStore({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ y: -2, scale: 1.12, transition: bouncy }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <Store size={size} color={color} />
    </motion.span>
  );
}

// ─── Check / CheckCheck — spring pop ─────────────────────────────────────────
export function AnimatedCheck({
  size = 16,
  color,
  double = false,
}: {
  size?: number;
  color?: string;
  double?: boolean;
}) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={bouncy}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      {double ? <CheckCheck size={size} color={color} /> : <Check size={size} color={color} />}
    </motion.span>
  );
}

// ─── SlidersHorizontal — slide on hover ──────────────────────────────────────
export function AnimatedSliders({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ x: [0, 2, -2, 1, -1, 0], transition: { duration: 0.4 } }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <SlidersHorizontal size={size} color={color} />
    </motion.span>
  );
}

// ─── ImagePlus — scale up ─────────────────────────────────────────────────────
export function AnimatedImagePlus({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.18, transition: bouncy }}
      whileTap={{ scale: 0.82 }}
      style={{ display: "inline-flex" }}
    >
      <ImagePlus size={size} color={color} />
    </motion.span>
  );
}

// ─── CalendarCheck — spring bounce ────────────────────────────────────────────
export function AnimatedCalendarCheck({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ scale: [1, 1.2, 0.92, 1.08, 1], transition: { duration: 0.4 } }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <CalendarCheck size={size} color={color} />
    </motion.span>
  );
}

// ─── Save — flash on hover ────────────────────────────────────────────────────
export function AnimatedSave({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.15, y: -1, transition: bouncy }}
      whileTap={{ scale: 0.85, y: 1 }}
      style={{ display: "inline-flex" }}
    >
      <Save size={size} color={color} />
    </motion.span>
  );
}

// ─── Archive — drop on hover ──────────────────────────────────────────────────
export function AnimatedArchive({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ y: 3, scale: 1.1, transition: bouncy }}
      whileTap={{ y: 0, scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <Archive size={size} color={color} />
    </motion.span>
  );
}

// ─── BadgeCheck — spring pop ──────────────────────────────────────────────────
export function AnimatedBadgeCheck({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.2, rotate: -5, transition: bouncy }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <BadgeCheck size={size} color={color} />
    </motion.span>
  );
}

// ─── Wrench — wiggle ─────────────────────────────────────────────────────────
export function AnimatedWrench({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ rotate: [0, -20, 20, -10, 10, 0], transition: { duration: 0.45 } }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <Wrench size={size} color={color} />
    </motion.span>
  );
}

// ─── X close — spin pop out ───────────────────────────────────────────────────
export function AnimatedX({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.span
      whileHover={{ rotate: 90, scale: 1.15, transition: snap }}
      whileTap={{ scale: 0.82 }}
      style={{ display: "inline-flex" }}
    >
      <X size={size} color={color} />
    </motion.span>
  );
}

// ─── BriefcaseBusiness, GraduationCap, HeartHandshake ────────────────────────
export function AnimatedBriefcase({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <motion.span whileHover={{ y: -2, scale: 1.12, transition: bouncy }} whileTap={{ scale: 0.85 }} style={{ display: "inline-flex" }}>
      <BriefcaseBusiness size={size} color={color} />
    </motion.span>
  );
}

export function AnimatedGraduationCap({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <motion.span whileHover={{ y: -3, rotate: -5, scale: 1.12, transition: bouncy }} whileTap={{ scale: 0.85 }} style={{ display: "inline-flex" }}>
      <GraduationCap size={size} color={color} />
    </motion.span>
  );
}

export function AnimatedHeartHandshake({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <motion.span
      whileHover={{ scale: [1, 1.2, 0.9, 1.1, 1], transition: { duration: 0.4 } }}
      whileTap={{ scale: 0.85 }}
      style={{ display: "inline-flex" }}
    >
      <HeartHandshake size={size} color={color} />
    </motion.span>
  );
}

export function AnimatedList({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <motion.span whileHover={{ x: 2, scale: 1.1, transition: soft }} whileTap={{ scale: 0.85 }} style={{ display: "inline-flex" }}>
      <List size={size} color={color} />
    </motion.span>
  );
}

export function AnimatedCircle({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <motion.span whileHover={{ scale: 1.3, transition: bouncy }} whileTap={{ scale: 0.7 }} style={{ display: "inline-flex" }}>
      <Circle size={size} color={color} />
    </motion.span>
  );
}

// ─── ThemeToggle — sun ↔ moon ───────────────────────────────────────────────
export function AnimatedThemeToggle({
  isDark,
  onToggle,
  size = 18,
}: {
  isDark: boolean;
  onToggle: () => void;
  size?: number;
}) {
  const springCfg = { type: "spring", stiffness: 400, damping: 22 } as const;
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className="relative grid place-items-center rounded-xl overflow-hidden transition-colors hover:bg-[var(--surface-raised)]"
      style={{ width: size + 16, height: size + 16, border: "1px solid var(--border)" }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={springCfg}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1   }}
            exit={{   opacity: 0, rotate:  90,  scale: 0.5 }}
            transition={springCfg}
            style={{ display: "inline-flex" }}
          >
            <Moon size={size} style={{ color: "var(--caramel)" }} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: 90,  scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1   }}
            exit={{   opacity: 0, rotate: -90,  scale: 0.5 }}
            transition={springCfg}
            style={{ display: "inline-flex" }}
          >
            <Sun size={size} style={{ color: "var(--caramel)" }} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Heart — fills on save (cm pattern) ──────────────────────────────────────
export function AnimatedHeart({
  saved,
  onToggle,
  size = 18,
  className,
}: {
  saved: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: number;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.78 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      className={`grid place-items-center ${className ?? ""}`}
    >
      <motion.div
        animate={{ scale: saved ? [1, 1.35, 1] : 1 }}
        transition={{ duration: 0.28 }}
        key={String(saved)}
      >
        <Heart
          size={size}
          style={{
            fill:   saved ? "var(--caramel)" : "transparent",
            stroke: saved ? "var(--caramel)" : "currentColor",
            transition: "fill 200ms ease, stroke 200ms ease",
          }}
        />
      </motion.div>
    </motion.button>
  );
}
