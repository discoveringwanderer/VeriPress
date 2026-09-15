import { useEffect, useState, useRef } from "react";
import type { UserProfile } from "./api/veriPressApi";
import { veriPressApi } from "./api/veriPressApi";
import { VeriPressProvider } from "./context/VeriPressContext";
import { useAppRouter } from "./hooks/useAppRouter";
import { useVeriPress } from "./hooks/useVeriPress";
import LOGO_SRC from "./imports/VeriPressLogo.png";

// ── Images ──────────────────────────────────────────────────────────────────
const IMG_TRAVEL = "https://images.unsplash.com/photo-1516546453174-5e1098a4b4af?w=600&h=400&fit=crop&auto=format";
const IMG_PORTRAIT = "https://images.unsplash.com/photo-1613698808499-f772ccb4f527?w=600&h=400&fit=crop&auto=format";
const IMG_LAPTOP = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop&auto=format";
const IMG_WRITING = "https://images.unsplash.com/photo-1499914485622-a88fac536970?w=600&h=400&fit=crop&auto=format";

const AVATAR_1 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format";
const AVATAR_2 = "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format";
const AVATAR_3 = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format";
const AVATAR_4 = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format";
const AVATAR_5 = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format";
const AVATAR_6 = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&auto=format";
const AVATAR_SAM = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format";

// ── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "splash" | "onboarding" | "auth-options" | "sign-in" | "create-account"
  | "complete-profile" | "discover-people" | "signup-success"
  | "home" | "discover" | "create-article" | "my-articles" | "profile"
  | "edit-profile" | "article-detail" | "public-profile"
  | "popular-articles" | "top-writers" | "new-articles"
  | "following-list" | "followers-list" | "profile-articles";

type Article = {
  id: string;
  title: string;
  author: string;
  avatar: string;
  time: string;
  image: string;
  body: string;
  category: string;
};

type AccountDraft = { username: string; email: string; password: string; confirm: string };
type ProfileDraft = Pick<UserProfile, "name" | "phone" | "gender" | "dob" | "avatar" | "description">;

// ── Shared components ─────────────────────────────────────────────────────────

function VeriPressLogo({ size = 48 }: { size?: number }) {
  return <img src={LOGO_SRC} alt="VeriPress" width={size} height={size} className="object-contain" />;
}

function StatusBar() {
  return <div className="h-8 flex-shrink-0" />;
}


function readProfileImage(file: File, onLoad: (image: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string") return;
    const image = new Image();
    image.onload = () => {
      const maxSize = 256;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      onLoad(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function BackArrow({ onPress }: { onPress: () => void }) {
  return (
    <button onClick={onPress} className="p-1">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M15 18L9 12L15 6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function PrimaryButton({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-full text-white font-semibold text-base transition-opacity"
      style={{ background: disabled ? "#9ca3af" : "#1B2B6B" }}
    >
      {label}
    </button>
  );
}

function OutlineButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 rounded-full font-semibold text-base border-2 transition-colors"
      style={{ borderColor: "#1B2B6B", color: "#1B2B6B" }}
    >
      {label}
    </button>
  );
}

function TextInput({
  label, placeholder, value, onChange, type = "text", rightIcon
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; rightIcon?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative border-b border-gray-300 flex items-center">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full py-2 text-gray-900 text-sm bg-transparent placeholder-gray-400 pr-8"
        />
        {rightIcon && <div className="absolute right-0">{rightIcon}</div>}
      </div>
    </div>
  );
}

function ArticleCard({
  image, title, author, avatar, time, onPress, onAuthor, showMenu = false
}: {
  image: string; title: string; author: string; avatar: string;
  time: string; onPress?: () => void; onAuthor?: () => void; showMenu?: boolean;
}) {
  return (
    <div className="text-left w-full">
      <button onClick={onPress} className="block text-left w-full">
        <div className="rounded-xl overflow-hidden mb-2 w-full aspect-[16/10] bg-gray-200">
          <ArticleImage src={image} alt={title} className="w-full h-full object-cover" />
        </div>
        <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">{title}</p>
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PersonAvatar src={avatar} name={author} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          <button onClick={onAuthor} className="text-xs text-gray-500">{author}</button>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        {showMenu && (
          <button className="p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="#9ca3af" />
              <circle cx="12" cy="12" r="1.5" fill="#9ca3af" />
              <circle cx="12" cy="19" r="1.5" fill="#9ca3af" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function ArticleListItem({
  image, title, author, avatar, time, showEdit = false, onPress, onEdit, onDelete
}: {
  image: string; title: string; author: string; avatar: string;
  time: string; showEdit?: boolean; onPress?: () => void; onEdit?: () => void; onDelete?: () => void;
}) {
  return (
    <div className="flex gap-3 w-full text-left py-3 border-b border-gray-100">
      <button onClick={onPress} className="flex gap-3 flex-1 min-w-0 text-left">
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200">
        <ArticleImage src={image} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{title}</p>
        <div className="flex items-center gap-1.5">
          <PersonAvatar src={avatar} name={author} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          <span className="text-xs text-gray-500">{author}</span>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
      </div>
      </button>
      {showEdit && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={event => { event.stopPropagation(); onEdit?.(); }} className="p-1" aria-label={`Edit ${title}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          </button>
          <button onClick={event => { event.stopPropagation(); onDelete?.(); }} className="p-1" aria-label={`Delete ${title}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="1.5" fill="#9ca3af" />
            <circle cx="12" cy="12" r="1.5" fill="#9ca3af" />
            <circle cx="12" cy="19" r="1.5" fill="#9ca3af" />
          </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) {
  const tabs = [
    { id: "home" as Screen, label: "Home", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#1B2B6B" : "none"} stroke={active ? "#1B2B6B" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )},
    { id: "discover" as Screen, label: "Discover", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1B2B6B" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    )},
    { id: "create-article" as Screen, label: "", icon: () => null },
    { id: "my-articles" as Screen, label: "My Articles", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1B2B6B" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    )},
    { id: "profile" as Screen, label: "Profile", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1B2B6B" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    )},
  ];

  return (
    <div className="flex-shrink-0 flex items-center border-t border-gray-100 bg-white px-2 pb-1 pt-2">
      {tabs.map((tab) => (
        tab.id === "create-article" ? (
          <div key="create" className="flex-1 flex justify-center">
            <button
              onClick={() => onNavigate("create-article")}
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "#1B2B6B" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1"
          >
            {tab.icon(active === tab.id)}
            <span className="text-[10px]" style={{ color: active === tab.id ? "#1B2B6B" : "#9ca3af" }}>
              {tab.label}
            </span>
          </button>
        )
      ))}
    </div>
  );
}

// ── SCREENS ───────────────────────────────────────────────────────────────────

function SplashScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="mb-6">
          <img src={LOGO_SRC} alt="VeriPress" width="100" height="100" className="object-contain" />
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#1B2B6B" }}>VeriPress</h1>
        <p className="text-gray-500 text-base text-center">Your Source. Your Stories. Your News.</p>
      </div>
      <div className="px-8 pb-12">
        <PrimaryButton label="Get Started" onClick={onNext} />
      </div>
    </div>
  );
}

const ONBOARDING_SLIDES = [
  {
    title: "Stay connected to what matters!",
    desc: "Tailor your feed, follow top writers, and dive into stories that shape your world—all in one place with VeriPress.",
    image: IMG_LAPTOP,
  },
  {
    title: "Create and Publish your own stories!",
    desc: "Turn your ideas into published articles in just a few taps. Powerful formatting tools make story crafting effortless.",
    image: IMG_WRITING,
  },
  {
    title: "Build your community right now!",
    desc: "Engage with passionate writers, exchange ideas in real time, and grow your own loyal audience on VeriPress.",
    image: IMG_PORTRAIT,
  },
];

function OnboardingScreen({ onSkip, onDone }: { onSkip: () => void; onDone: () => void }) {
  const [slide, setSlide] = useState(0);
  const s = ONBOARDING_SLIDES[slide];

  function next() {
    if (slide < ONBOARDING_SLIDES.length - 1) setSlide(slide + 1);
    else onDone();
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex-1 flex flex-col">
        {/* Image area */}
        <div className="mx-4 mt-2 rounded-2xl overflow-hidden bg-gray-100 h-56 relative">
          <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
          {/* Mini phone mockup overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-44 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 opacity-90">
              <img src={s.image} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between px-6 pt-8 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-3 leading-tight">{s.title}</h2>
            <p className="text-gray-500 text-sm text-center leading-relaxed">{s.desc}</p>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 my-6">
            {ONBOARDING_SLIDES.map((_, i) => (
              <div
                key={i}
                className="h-2 rounded-full transition-all"
                style={{ width: i === slide ? 20 : 8, background: i === slide ? "#1B2B6B" : "#d1d5db" }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <OutlineButton label="Skip" onClick={onSkip} />
            <PrimaryButton label="Next" onClick={next} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthOptionsScreen({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex-1 flex flex-col">
        {/* Top logo area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-32 h-32 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4A90E2,#1B2B9B)" }}>
            <img src={LOGO_SRC} alt="VeriPress" width="96" height="96" className="object-contain" />
          </div>
        </div>

        <div className="px-6 pb-10">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Let's you in</h2>

          <PrimaryButton label="Sign in with password" onClick={onSignIn} />

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{" "}
            <button onClick={onSignUp} className="font-semibold" style={{ color: "#1B2B6B" }}>
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInScreen({ onBack, onSignIn }: { onBack: () => void; onSignIn: (identifier: string, password: string) => Promise<boolean> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError("Enter your username/email and password.");
      return;
    }
    setSigningIn(true);
    const valid = await onSignIn(email, password);
    setSigningIn(false);
    if (!valid) {
      setError("This account was not recognized. Check your credentials or sign up first.");
    } else {
      setError("");
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="px-6 pt-2 pb-4">
        <BackArrow onPress={onBack} />
      </div>
      <div className="flex-1 px-6 overflow-y-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Hello there 👋</h2>
        <p className="text-gray-500 text-sm mb-8">Please enter your username/email and password to sign in</p>

        <TextInput label="Username / Email" placeholder="Username or Email" value={email} onChange={setEmail} />
        <TextInput
          label="Password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
          type={show ? "text" : "password"}
          rightIcon={
            <button onClick={() => setShow(!show)} className="p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {show ? (
                  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                ) : (
                  <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                )}
              </svg>
            </button>
          }
        />

        {error && <p className="text-center text-sm text-red-500 mb-4">{error}</p>}
      </div>
      <div className="px-6 pb-10">
        <PrimaryButton label={signingIn ? "Signing in..." : "Sign In"} onClick={submit} disabled={signingIn} />
      </div>
    </div>
  );
}

function CreateAccountScreen({ draft, onDraftChange, onBack, onContinue }: { draft: AccountDraft; onDraftChange: (draft: AccountDraft) => void; onBack: () => void; onContinue: (account: { username: string; email: string; password: string }) => Promise<"created" | "username-exists" | "email-exists" | "account-exists"> }) {
  const [showP, setShowP] = useState(false);
  const [showC, setShowC] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!draft.username.trim() || !draft.email.trim() || !draft.password || !draft.confirm) return setError("Complete all fields to create your account.");
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) return setError("Enter a valid email address.");
    if (draft.password.length < 6) return setError("Password must be at least 6 characters.");
    if (draft.password !== draft.confirm) return setError("Passwords do not match.");
    const result = await onContinue({ username: draft.username.trim(), email: draft.email.trim(), password: draft.password });
    if (result !== "created") {
      setError(result === "username-exists" ? "That username is already in use." : result === "email-exists" ? "That email is already registered." : "An account already exists. Sign in with that account.");
      return;
    }
    setError("");
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center gap-2 px-6 pt-2 pb-4">
        <BackArrow onPress={onBack} />
        <div className="flex-1 flex gap-1 ml-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= 2 ? "#1B2B6B" : "#e5e7eb" }} />
          ))}
        </div>
      </div>
      <div className="flex-1 px-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create an account 🔐</h2>
        <p className="text-gray-500 text-xs mb-6">Enter your username, email & password. If you forget it, then you have to do forgot password.</p>

        <TextInput label="Username" placeholder="Username" value={draft.username} onChange={username => onDraftChange({ ...draft, username })} />
        <TextInput label="Email" placeholder="Email" value={draft.email} onChange={email => onDraftChange({ ...draft, email })} type="email" />
        <TextInput label="Password" placeholder="Password" value={draft.password} onChange={password => onDraftChange({ ...draft, password })} type={showP ? "text" : "password"}
          rightIcon={
            <button onClick={() => setShowP(!showP)} className="p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showP ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>}
              </svg>
            </button>
          }
        />
        <TextInput label="Confirm Password" placeholder="Confirm Password" value={draft.confirm} onChange={confirm => onDraftChange({ ...draft, confirm })} type={showC ? "text" : "password"}
          rightIcon={
            <button onClick={() => setShowC(!showC)} className="p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showC ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>}
              </svg>
            </button>
          }
        />

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      </div>
      <div className="px-6 pb-10">
        <PrimaryButton label="Continue" onClick={submit} />
      </div>
    </div>
  );
}

function CompleteProfileScreen({ draft, onDraftChange, onBack, onContinue }: { draft: ProfileDraft; onDraftChange: (draft: ProfileDraft) => void; onBack: () => void; onContinue: (profile: Partial<UserProfile>) => Promise<boolean> }) {
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!draft.name.trim() || !draft.phone.trim() || !draft.gender.trim() || !draft.dob.trim()) {
      setError("Complete all profile fields before continuing.");
      return;
    }
    const ok = await onContinue({ name: draft.name.trim(), phone: draft.phone.trim(), gender: draft.gender.trim(), dob: draft.dob.trim(), avatar: draft.avatar, description: draft.description.trim() });
    if (!ok) {
      setError("Please check your profile details.");
      return;
    }
    setError("");
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center gap-2 px-6 pt-2 pb-4">
        <BackArrow onPress={onBack} />
        <div className="flex-1 flex gap-1 ml-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{ background: "#1B2B6B" }} />
          ))}
        </div>
      </div>
      <div className="flex-1 px-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Complete your profile 📋</h2>
        <p className="text-gray-500 text-xs mb-6">Don't worry, only you can see your personal data. No one else will be able to see it.</p>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
              <PersonAvatar src={draft.avatar} name="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#1B2B6B" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
              </svg>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              readProfileImage(file, avatar => onDraftChange({ ...draft, avatar }));
            }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#1B2B6B" }} aria-label="Upload profile picture">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
            </button>
          </div>
        </div>

        <TextInput label="Full Name" placeholder="Full Name" value={draft.name} onChange={name => onDraftChange({ ...draft, name })} />
        <TextInput label="Phone Number" placeholder="Phone Number" value={draft.phone} onChange={phone => onDraftChange({ ...draft, phone })} type="tel" />

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={3} value={draft.description} onChange={event => onDraftChange({ ...draft, description: event.target.value })} placeholder="Tell people about yourself" className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl p-3 resize-none leading-relaxed" />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <div className="relative border-b border-gray-300">
            <select value={draft.gender} onChange={event => onDraftChange({ ...draft, gender: event.target.value })} className="w-full appearance-none bg-transparent py-2 pr-8 text-sm text-gray-900">
              <option value="" disabled>Select gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            <svg className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <div className="relative border-b border-gray-300">
            <input type="date" value={draft.dob} onChange={event => onDraftChange({ ...draft, dob: event.target.value })} className="w-full bg-transparent py-2 text-sm text-gray-900" />
          </div>
        </div>
      </div>
      {error && <p className="px-6 text-sm text-red-500 mb-2">{error}</p>}
      <div className="px-6 pb-10">
        <PrimaryButton label="Continue" onClick={submit} />
      </div>
    </div>
  );
}

type Person = { name: string; handle: string; avatar: string | null; following: boolean };

function PersonAvatar({ src, name, className }: { src: string | null; name: string; className: string }) {
  if (src) return <img src={src} alt={name} className={className} />;
  return (
    <div className={`${className} flex-shrink-0 flex items-center justify-center overflow-hidden`} style={{ background: "#d1d5db" }} aria-label={name}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        <circle cx="50" cy="38" r="22" fill="#9ca3af" />
        <ellipse cx="50" cy="92" rx="34" ry="26" fill="#9ca3af" />
      </svg>
    </div>
  );
}

// Renders an article cover image, or a grey landscape placeholder when no image is set.
function ArticleImage({ src, alt, className }: { src: string | null | undefined; alt: string; className: string }) {
  if (src) return <img src={src} alt={alt} className={className} />;
  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: "#d1d5db" }}>
      <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="50%" height="50%">
        <rect x="4" y="4" width="72" height="52" rx="6" stroke="white" strokeWidth="4" fill="none" />
        <circle cx="22" cy="22" r="7" fill="white" />
        <path d="M4 44l18-16 14 14 10-10 18 14" stroke="white" strokeWidth="4" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

const TOP_WRITERS = [
  { name: "John Doe", avatar: AVATAR_3 },
  { name: "Isla Cruz", avatar: AVATAR_2 },
  { name: "Sam Smith", avatar: AVATAR_SAM },
  { name: "Kate Hayes", avatar: AVATAR_4 },
];

const SUGGESTED_PEOPLE: Person[] = [
  { name: "Rodolfo Goode", handle: "@rodolfo_goode", avatar: AVATAR_1, following: false },
  { name: "Chieko Chute", handle: "@chieko_chute", avatar: AVATAR_2, following: true },
  { name: "Kylee Danford", handle: "@kylee_danford", avatar: AVATAR_3, following: false },
  { name: "Chantal Shelburne", handle: "@chantal_shelburne", avatar: AVATAR_4, following: false },
  { name: "Phyllis Godley", handle: "@phyllis_godley", avatar: AVATAR_5, following: true },
  { name: "Francene Vandyne", handle: "@francene_vandyne", avatar: AVATAR_6, following: false },
  { name: "Tyra Dhillon", handle: "@tyra_dhillon", avatar: AVATAR_SAM, following: true },
];

function DiscoverPeopleScreen({ people, onBack, onFinish, following, onToggleFollowing, onViewProfile }: { people: Person[]; onBack: () => void; onFinish: () => void; following: Record<string, boolean>; onToggleFollowing: (handle: string) => void; onViewProfile: (person: Person) => void }) {
  const [success, setSuccess] = useState(false);

  function handleFinish() {
    setSuccess(true);
    setTimeout(onFinish, 1800);
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <StatusBar />
      <div className="flex items-center gap-2 px-6 pt-2 pb-4">
        <BackArrow onPress={onBack} />
        <div className="flex-1 flex gap-1 ml-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{ background: "#1B2B6B" }} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Discover People 🤩</h2>
        <p className="text-gray-500 text-xs mb-5">Pick some people to follow.</p>

        {people.map(p => (
          <div key={p.handle} className="flex items-center gap-3 py-3 border-b border-gray-100">
            <PersonAvatar src={p.avatar} name={p.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <button onClick={() => onViewProfile(p)} className="font-semibold text-gray-900 text-sm text-left">{p.name}</button>
              <p className="text-gray-400 text-xs">{p.handle}</p>
            </div>
            <button
              onClick={() => onToggleFollowing(p.handle)}
              className="px-5 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors"
              style={following[p.handle]
                ? { background: "#1B2B6B", borderColor: "#1B2B6B", color: "white" }
                : { background: "white", borderColor: "#d1d5db", color: "#1B2B6B" }
              }
            >
              {following[p.handle] ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </div>

      <div className="px-6 pb-10 pt-4">
        <PrimaryButton label="Finish" onClick={handleFinish} />
      </div>

      {/* Success overlay */}
      {success && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "#1B2B6B" }}>
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sign Up Successful!</h3>
          <p className="text-gray-500 text-sm text-center px-8">Your account has been created. Please wait a moment, we are preparing for you.</p>
        </div>
      )}
    </div>
  );
}

const ARTICLES: Article[] = [
  { id: "1", title: "Places Worth Getting Lost In", author: "John Doe", avatar: AVATAR_3, time: "5 days ago", image: IMG_TRAVEL, body: "There are places in this world that seem designed to make you lose track of time. Where narrow cobblestone streets wind unexpectedly into sun-drenched piazzas, and every turn reveals something worth pausing for — a crumbling archway, a vendor selling roasted nuts, the sound of distant music. Getting lost in these places isn't a mistake. It's the whole point.\n\nSome of the best travel experiences come not from following a carefully curated itinerary, but from the willingness to wander without a fixed destination. The world rewards curiosity more often than it punishes it.", category: "Travel" },
  { id: "2", title: "The Stories Behind the People", author: "Isla Cruz", avatar: AVATAR_2, time: "5 days ago", image: IMG_PORTRAIT, body: "Every person we meet carries a story that we may never see. Behind every smile, achievement, failure, and ordinary day is a journey filled with experiences that shaped who they are today.\n\nWe often see people only from the outside. We see a successful student, a hardworking employee, a friendly neighbor, or a stranger passing by. But there is always more beneath the surface. Some people are quietly working toward their dreams. Others are carrying struggles they rarely talk about.\n\nThe most meaningful stories are not always about famous people or extraordinary achievements. Sometimes, they are about ordinary individuals who continue moving forward despite difficult circumstances.", category: "People" },
  { id: "3", title: "5 Tips to Plan the Perfect Weekend Getaway", author: "Isla Cruz", avatar: AVATAR_2, time: "5 mins ago", image: IMG_TRAVEL, body: "Planning a weekend getaway doesn't have to be complicated. With the right approach, you can create a memorable escape even with limited time and budget. Here are five tips to help you make the most of your next mini-vacation.\n\nFirst, choose a destination within driving distance. Spending too much time in transit eats into your precious weekend hours. Second, book accommodations early — the best spots fill up fast. Third, plan just one anchor activity per day, leaving room for spontaneity. Fourth, pack light. A single bag keeps things simple and stress-free. Finally, disconnect from work notifications and be fully present.", category: "Lifestyle" },
  { id: "4", title: "The Ultimate Guide to Better Study Habits", author: "Kate Hayes", avatar: AVATAR_4, time: "5 mins ago", image: IMG_LAPTOP, body: "Studying effectively is less about how many hours you put in and more about how you use those hours. Research consistently shows that focused, strategic study sessions outperform marathon cramming sessions.\n\nStart with the Pomodoro Technique: 25 minutes of focused work followed by a 5-minute break. This maintains mental freshness and prevents burnout. Next, use active recall instead of passive re-reading — test yourself on the material. Spaced repetition, reviewing content at increasing intervals, is one of the most powerful memory tools available.", category: "Education" },
  { id: "5", title: "The Digital Habits We Should Leave Behind", author: "Sam Smith", avatar: AVATAR_SAM, time: "5 mins ago", image: IMG_WRITING, body: "Our relationship with technology has grown complicated. What started as tools to make life easier have, in many cases, become sources of anxiety, distraction, and compulsive behavior.\n\nScrolling through social media before bed disrupts sleep patterns. Checking email first thing in the morning hijacks your morning focus. Multitasking across multiple screens reduces the quality of everything you're doing.\n\nThe good news is that awareness is the first step. Small intentional changes — like keeping your phone out of the bedroom, scheduling email check-ins rather than monitoring constantly, and designating tech-free hours — can dramatically improve your relationship with digital tools.", category: "Technology" },
];

function HomeScreen({ onNavigate, onArticle, onAuthor, userArticles }: { onNavigate: (s: Screen) => void; onArticle: (id: string) => void; onAuthor: (name: string) => void; userArticles: Article[] }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <VeriPressLogo size={28} />
            <span className="font-bold text-base" style={{ color: "#1B2B6B" }}>VeriPress</span>
          </div>
          <button onClick={() => onNavigate("discover")} className="w-8 h-8 flex items-center justify-center" aria-label="Search articles and writers">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* Banner */}
        <div className="mx-4 mb-5 rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#1B2B6B,#2D45A0)" }}>
          <p className="font-bold text-lg leading-snug mb-3 max-w-[160px]">Your Source. Your Stories. Your News.</p>
          <button onClick={() => onNavigate("discover")} className="bg-white text-xs font-semibold px-4 py-2 rounded-full" style={{ color: "#1B2B6B" }}>Read Now</button>
          <div className="absolute right-4 bottom-2 opacity-20">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
              <path d="M18 22L50 78L82 22" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>

        {/* Recent Articles */}
        <div className="px-4 mb-5">
          <h3 className="font-bold text-gray-900 mb-3">Recent Articles</h3>
          <div className="grid grid-cols-2 gap-3">
            {ARTICLES.slice(0, 2).map(a => (
              <ArticleCard key={a.id} image={a.image} title={a.title} author={a.author} avatar={a.avatar} time={a.time} onPress={() => onArticle(a.id)} onAuthor={() => onAuthor(a.author)} />
            ))}
          </div>
        </div>

        {/* My Articles */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">My Articles</h3>
            <button onClick={() => onNavigate("my-articles")} className="text-xs font-medium" style={{ color: "#1B2B6B" }}>View all</button>
          </div>
          {userArticles.length === 0 ? (
            <button onClick={() => onNavigate("create-article")} className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-6 text-center">
              <p className="font-semibold text-gray-800 text-sm">Start your first article</p>
              <p className="text-gray-400 text-xs mt-1">Tap here to share your story with VeriPress.</p>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {userArticles.slice(0, 2).map(a => (
                <ArticleCard key={a.id} image={a.image} title={a.title} author={a.author} avatar={a.avatar} time={a.time} onPress={() => onArticle(a.id)} onAuthor={() => onAuthor(a.author)} showMenu />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  );
}

function DiscoverScreen({ onNavigate, onOpenList, onArticle, onAuthor, publishedArticles, registeredWriters }: { onNavigate: (s: Screen) => void; onOpenList: (s: Screen) => void; onArticle: (id: string) => void; onAuthor: (name: string) => void; publishedArticles: Article[]; registeredWriters: Person[] }) {
  const [search, setSearch] = useState("");
  const searchTerm = search.trim().toLowerCase();
  const searchableArticles = [...publishedArticles, ...ARTICLES].filter(article => {
    if (!searchTerm) return false;
    return `${article.title} ${article.author} ${article.category}`.toLowerCase().includes(searchTerm);
  });
  const searchableWriters = [...registeredWriters, ...TOP_WRITERS
    .filter(writer => !registeredWriters.some(registered => registered.name.toLowerCase() === writer.name.toLowerCase()))]
    .filter(writer => !searchTerm || `${writer.name} ${"handle" in writer ? writer.handle : ""}`.toLowerCase().includes(searchTerm));

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <h2 className="font-bold text-xl mb-3" style={{ color: "#1B2B6B" }}>Discover</h2>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5 mb-5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for Article"
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400"
            />
          </div>

          {searchTerm && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Search results</h3>
              {searchableArticles.length === 0 && searchableWriters.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No articles or registered writers found.</p>
              ) : (
                <>
                  {searchableWriters.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Writers</p>
                      <div className="space-y-1">
                        {searchableWriters.map(writer => (
                          <button key={"handle" in writer ? writer.handle : writer.name} onClick={() => onAuthor(writer.handle)} className="flex items-center gap-3 w-full py-2 text-left">
                            <PersonAvatar src={writer.avatar} name={writer.name} className="w-10 h-10 rounded-full object-cover" />
                            <span className="font-semibold text-sm text-gray-900">{writer.name}</span>
                            {"handle" in writer && <span className="text-xs text-gray-400">{writer.handle}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchableArticles.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Articles</p>
                      {searchableArticles.map(article => (
                        <ArticleListItem key={article.id} image={article.image} title={article.title} author={article.author} avatar={article.avatar} time={article.time} onPress={() => onArticle(article.id)} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Most Popular */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Most Popular</h3>
            <button onClick={() => onOpenList("popular-articles")} className="text-xs font-medium px-2 py-1" style={{ color: "#1B2B6B" }} aria-label="Show most popular articles">→</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {ARTICLES.slice(0, 2).map(a => (
              <ArticleCard key={a.id} image={a.image} title={a.title} author={a.author} avatar={a.avatar} time={a.time} onPress={() => onArticle(a.id)} onAuthor={() => onAuthor(a.author)} />
            ))}
          </div>

          {/* Top Writers */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Top Writers</h3>
            <button onClick={() => onOpenList("top-writers")} className="text-xs font-medium px-2 py-1" style={{ color: "#1B2B6B" }} aria-label="Show top writers">→</button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {TOP_WRITERS.slice(0, 4).map(w => (
              <button key={w.name} onClick={() => onAuthor(w.name)} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                <div className="h-14 w-14 max-w-full rounded-full overflow-hidden bg-gray-200 ring-2 ring-offset-1 ring-blue-800">
                  <img src={w.avatar} alt={w.name} className="w-full h-full object-cover" />
                </div>
                <span className="w-full break-words text-xs font-medium leading-tight text-gray-700">{w.name}</span>
              </button>
            ))}
          </div>

          {/* New Articles */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">New Articles</h3>
            <button onClick={() => onOpenList("new-articles")} className="text-xs font-medium px-2 py-1" style={{ color: "#1B2B6B" }} aria-label="Show new articles">→</button>
          </div>
          <div className="space-y-0">
            {ARTICLES.slice(2).map(a => (
              <ArticleListItem key={a.id} image={a.image} title={a.title} author={a.author} avatar={a.avatar} time={a.time} onPress={() => onArticle(a.id)} />
            ))}
          </div>
        </div>
      </div>
      <BottomNav active="discover" onNavigate={onNavigate} />
    </div>
  );
}

function DiscoverListScreen({ kind, onBack, onArticle, onAuthor }: { kind: "popular" | "writers" | "new"; onBack: () => void; onArticle: (id: string) => void; onAuthor: (name: string) => void }) {
  const title = kind === "writers" ? "Top Writers" : kind === "new" ? "New Articles" : "Most Popular";
  const articles = kind === "new" ? ARTICLES.slice(2) : kind === "popular" ? ARTICLES : [];

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <BackArrow onPress={onBack} />
        <h2 className="font-bold text-base text-gray-900">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {kind === "writers" ? (
          <div className="space-y-1">
            {TOP_WRITERS.map(writer => (
              <button key={writer.name} onClick={() => onAuthor(writer.name)} className="flex items-center gap-3 w-full py-3 border-b border-gray-100 text-left">
                <PersonAvatar src={writer.avatar} name={writer.name} className="w-12 h-12 rounded-full object-cover" />
                <span className="font-semibold text-sm text-gray-900">{writer.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            {articles.map(article => (
              <ArticleListItem key={article.id} image={article.image} title={article.title} author={article.author} avatar={article.avatar} time={article.time} onPress={() => onArticle(article.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MyArticlesScreen({ onNavigate, onArticle, userArticles, drafts, onCreate, onEdit, onDelete }: { onNavigate: (s: Screen) => void; onArticle: (id: string) => void; userArticles: Article[]; drafts: Article[]; onCreate: () => void; onEdit: (article: Article, isDraft: boolean) => void; onDelete: (article: Article, isDraft: boolean) => void }) {
  const [tab, setTab] = useState<"draft" | "published">("draft");

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-4">
          <VeriPressLogo size={24} />
          <h2 className="font-bold text-base" style={{ color: "#1B2B6B" }}>My Articles</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {(["draft", "published"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-sm font-semibold border-b-2 transition-colors capitalize"
              style={tab === t
                ? { borderColor: "#1B2B6B", color: "#1B2B6B" }
                : { borderColor: "transparent", color: "#9ca3af" }
              }
            >
              {t === "draft" ? `Draft (${drafts.length})` : `Published (${userArticles.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-500 text-xs">{tab === "draft" ? drafts.length : userArticles.length} Articles</p>
          <button onClick={onCreate} className="text-xs font-semibold" style={{ color: "#1B2B6B" }}>+ New article</button>
        </div>
        {tab === "draft" ? (drafts.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-semibold text-gray-800 text-sm">No drafts yet</p>
            <p className="text-gray-400 text-xs mt-1">Create something worth reading.</p>
          </div>
        ) : drafts.map(a => (
          <ArticleListItem key={a.id} image={a.image} title={a.title} author={a.author} avatar={a.avatar} time={a.time} showEdit onEdit={() => onEdit(a, true)} onDelete={() => onDelete(a, true)} />
        ))) : userArticles.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-semibold text-gray-800 text-sm">No published articles yet</p>
            <p className="text-gray-400 text-xs mt-1">Create something worth reading.</p>
          </div>
        ) : userArticles.map(a => (
          <ArticleListItem key={a.id} image={a.image} title={a.title} author={a.author} avatar={a.avatar} time={a.time} showEdit onPress={() => onArticle(a.id)} onEdit={() => onEdit(a, false)} onDelete={() => onDelete(a, false)} />
        ))}
      </div>

      <BottomNav active="my-articles" onNavigate={onNavigate} />
    </div>
  );
}

function DeleteArticleModal({ article, isDraft, onCancel, onConfirm }: { article: Article; isDraft: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center z-30" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="bg-white rounded-t-3xl w-full px-6 py-8">
        <h3 className="font-bold text-xl text-gray-900 text-center mb-2">Delete {isDraft ? "Draft" : "Published Article"}</h3>
        <p className="text-gray-500 text-sm text-center mb-6">Are you sure you want to delete "{article.title}"?</p>
        <div className="flex gap-3">
          <OutlineButton label="Cancel" onClick={onCancel} />
          <PrimaryButton label="Delete" onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}

function getFollowedPeople(following: Record<string, boolean>, registeredUsers: RegisteredUser[]): Person[] {
  const knownPeople = new Map<string, Person>();
  registeredUsers.forEach(user => knownPeople.set(`@${user.username}`.toLowerCase(), {
    name: user.name || user.username,
    handle: `@${user.username}`,
    avatar: user.avatar,
    following: true,
  }));
  SUGGESTED_PEOPLE.forEach(person => {
    if (!knownPeople.has(person.handle.toLowerCase())) knownPeople.set(person.handle.toLowerCase(), person);
  });
  ARTICLES.forEach(article => {
    const handle = `@${article.author.toLowerCase().replaceAll(" ", "_")}`;
    if (!knownPeople.has(handle)) {
      knownPeople.set(handle, { name: article.author, handle, avatar: article.avatar, following: false });
    }
  });

  return Object.entries(following)
    .filter(([, isFollowing]) => isFollowing)
    .map(([handle]) => knownPeople.get(handle.toLowerCase()) ?? {
      name: handle.replace(/^@/, "").replaceAll("_", " "),
      handle,
      avatar: null,
      following: true,
    });
}

function ProfileScreen({ onNavigate, onEdit, onEditArticle, onDeleteArticle, userArticles, onLogout, following, followers, profile, registeredUsers, onViewProfile, onViewConnections }: { onNavigate: (s: Screen) => void; onEdit: () => void; onEditArticle: (article: Article) => void; onDeleteArticle: (article: Article) => void; userArticles: Article[]; onLogout: () => void; following: Record<string, boolean>; followers: Record<string, number>; profile: UserProfile; registeredUsers: RegisteredUser[]; onViewProfile: (person: Person) => void; onViewConnections: (type: "articles" | "following" | "followers") => void }) {
  const followedPeople = getFollowedPeople(following, registeredUsers);
  const followingCount = Object.values(following).filter(Boolean).length;
  const selfHandle = profile.username ? `@${profile.username}` : "";

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-4">
            <VeriPressLogo size={24} />
            <h2 className="font-bold text-base" style={{ color: "#1B2B6B" }}>Profile</h2>
          </div>

          {/* Profile header */}
          <div className="flex items-center gap-3 mb-5">
            <PersonAvatar src={profile.avatar} name={profile.name || "Profile"} className="w-16 h-16 rounded-full object-cover" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-base">{profile.name || profile.username || "Your Profile"}</h3>
              <p className="text-gray-400 text-sm">@{profile.username || "username"}</p>
              {profile.dob && <p className="text-gray-400 text-xs mt-0.5">{profile.dob}</p>}
              {profile.description && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{profile.description}</p>}
            </div>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: "#1B2B6B", color: "white" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
              </svg>
              Edit
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-6">
            {[{ label: "Articles", value: String(userArticles.length), type: "articles" as const }, { label: "Following", value: String(followingCount), type: "following" as const }, { label: "Followers", value: String(followers[selfHandle.toLowerCase()] ?? 0), type: "followers" as const }].map(s => (
              <button key={s.label} type="button" onClick={() => onViewConnections(s.type)} className="flex-1 text-center">
                <p className="font-bold text-gray-900 text-base">{s.value}</p>
                <p className="text-gray-400 text-xs">{s.label}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 text-xs">{userArticles.length} Articles</p>
            <button onClick={onLogout} className="text-xs font-semibold text-red-500">Log out</button>
          </div>

          <div className="mb-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Following</h3>
            {followedPeople.length === 0 ? (
              <p className="text-gray-400 text-xs">You are not following anyone yet.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-1">
                {followedPeople.map(person => (
                  <button type="button" key={person.handle} onClick={() => onViewProfile(person)} aria-label={`View ${person.name}'s profile`} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
                    <PersonAvatar src={person.avatar} name={person.name} className="w-11 h-11 rounded-full object-cover" />
                    <span className="text-xs text-gray-700">{person.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {userArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-semibold text-gray-800 text-sm">Your profile is ready</p>
              <p className="text-gray-400 text-xs mt-1">Publish your first article to build your profile.</p>
            </div>
          ) : userArticles.map(a => (
            <ArticleListItem key={a.id} image={a.image} title={a.title} author={a.author} avatar={a.avatar} time={a.time} showEdit onPress={() => onNavigate("profile-articles")} onEdit={() => onEditArticle(a)} onDelete={() => onDeleteArticle(a)} />
          ))}
        </div>
      </div>
      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}

function ConnectionsScreen({ type, onBack, following, followers, profile, registeredUsers, followerHandles, onViewProfile }: { type: "following" | "followers"; onBack: () => void; following: Record<string, boolean>; followers: Record<string, number>; profile: UserProfile; registeredUsers: RegisteredUser[]; followerHandles: string[]; onViewProfile: (person: Person) => void }) {
  const followedPeople = getFollowedPeople(following, registeredUsers);
  const followerPeople = followerHandles.map(handle => {
    const user = registeredUsers.find(item => `@${item.username}`.toLowerCase() === handle.toLowerCase());
    if (user) return { name: user.name || user.username, handle, avatar: user.avatar, following: Boolean(following[handle]) };
    const rawUsername = handle.replace(/^@/, "");
    if (!rawUsername) return null;
    return { name: rawUsername, handle, avatar: null, following: Boolean(following[handle]) };
  }).filter((person): person is Person => person !== null);
  const count = type === "following" ? followedPeople.length : 0;

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <BackArrow onPress={onBack} />
        <h2 className="font-bold text-base text-gray-900">{type === "following" ? "Following" : "Followers"}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-gray-400 text-xs mb-3">{type === "following" ? `${count} people you follow` : `${followers[profile.username ? `@${profile.username}`.toLowerCase() : ""] ?? 0} followers`}</p>
        {type === "following" && followedPeople.length > 0 ? followedPeople.map(person => (
          <button key={person.handle} type="button" onClick={() => onViewProfile(person)} className="flex items-center gap-3 w-full py-3 border-b border-gray-100 text-left">
            <PersonAvatar src={person.avatar} name={person.name} className="w-12 h-12 rounded-full object-cover" />
            <div>
              <p className="font-semibold text-sm text-gray-900">{person.name}</p>
              <p className="text-gray-400 text-xs">{person.handle}</p>
            </div>
          </button>
        )) : type === "followers" && followerPeople.length > 0 ? followerPeople.map(person => (
          <button key={person.handle} type="button" onClick={() => onViewProfile(person)} className="flex items-center gap-3 w-full py-3 border-b border-gray-100 text-left">
            <PersonAvatar src={person.avatar} name={person.name} className="w-12 h-12 rounded-full object-cover" />
            <div>
              <p className="font-semibold text-sm text-gray-900">{person.name}</p>
              <p className="text-gray-400 text-xs">{person.handle}</p>
            </div>
          </button>
        )) : (
          <p className="text-center text-gray-400 text-sm py-12">{type === "following" ? "You are not following anyone yet." : "No followers yet."}</p>
        )}
      </div>
    </div>
  );
}

function ProfileArticlesScreen({ articles, onBack, onArticle }: { articles: Article[]; onBack: () => void; onArticle: (id: string) => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <BackArrow onPress={onBack} />
        <h2 className="font-bold text-base text-gray-900">Articles</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {articles.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">No published articles yet.</p>
        ) : articles.map(article => (
          <ArticleListItem key={article.id} image={article.image} title={article.title} author={article.author} avatar={article.avatar} time={article.time} onPress={() => onArticle(article.id)} />
        ))}
      </div>
    </div>
  );
}

function PublicProfileScreen({ person, articles, followingPeople, followerPeople, onBack, onArticle, following, followers, followingCount, isSelf, onToggleFollowing }: { person: Person; articles: Article[]; followingPeople: Person[]; followerPeople: Person[]; onBack: () => void; onArticle: (id: string) => void; following: boolean; followers: number; followingCount: number; isSelf: boolean; onToggleFollowing: () => void }) {
  const [selectedSection, setSelectedSection] = useState<"articles" | "followers" | "following">("articles");

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
        <BackArrow onPress={onBack} />
        <h2 className="font-bold text-base text-gray-900">Profile</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col items-center text-center">
          <PersonAvatar src={person.avatar} name={person.name} className="w-20 h-20 rounded-full object-cover mb-3" />
          <h1 className="font-bold text-xl text-gray-900">{person.name}</h1>
          <p className="text-gray-400 text-sm mb-3">{person.handle}</p>
          {!isSelf && <button
            onClick={onToggleFollowing}
            className="px-6 py-2 rounded-full text-sm font-semibold border-2 mb-5"
            style={following ? { background: "#1B2B6B", borderColor: "#1B2B6B", color: "white" } : { background: "white", borderColor: "#1B2B6B", color: "#1B2B6B" }}
          >
            {following ? "Following" : "Follow"}
          </button>}
        </div>
        <div className="flex gap-4 border-y border-gray-100 py-3 mb-5">
          {[{ label: "Articles", value: String(articles.length), section: "articles" as const }, { label: "Followers", value: String(followers), section: "followers" as const }, { label: "Following", value: String(followingCount), section: "following" as const }].map(stat => (
            <button key={stat.label} type="button" onClick={() => setSelectedSection(stat.section)} className={`flex-1 text-center rounded-lg py-1 ${selectedSection === stat.section ? "bg-gray-100" : ""}`}>
              <p className="font-bold text-gray-900 text-base">{stat.value}</p>
              <p className="text-gray-400 text-xs">{stat.label}</p>
            </button>
          ))}
        </div>
        {selectedSection === "articles" && <>
          <h3 className="font-bold text-gray-900 mb-3">Published Articles</h3>
          {articles.length === 0 ? <p className="text-gray-400 text-sm text-center py-10">No published articles yet.</p> : articles.map(article => (
            <ArticleListItem key={article.id} image={article.image} title={article.title} author={article.author} avatar={article.avatar} time={article.time} onPress={() => onArticle(article.id)} />
          ))}
        </>}
        {selectedSection === "following" && <>
          <h3 className="font-bold text-gray-900 mb-3">Following</h3>
          {followingPeople.length === 0 ? <p className="text-gray-400 text-sm">Not following anyone yet.</p> : followingPeople.map(profile => (
            <div key={profile.handle} className="flex items-center gap-3 py-2 border-b border-gray-100"><PersonAvatar src={profile.avatar} name={profile.name} className="w-10 h-10 rounded-full object-cover" /><div><p className="font-semibold text-sm text-gray-900">{profile.name}</p><p className="text-gray-400 text-xs">{profile.handle}</p></div></div>
          ))}
        </>}
        {selectedSection === "followers" && <>
          <h3 className="font-bold text-gray-900 mb-3">Followers</h3>
          {followerPeople.length === 0 ? <p className="text-gray-400 text-sm">No followers yet.</p> : followerPeople.map(profile => (
            <div key={profile.handle} className="flex items-center gap-3 py-2 border-b border-gray-100"><PersonAvatar src={profile.avatar} name={profile.name} className="w-10 h-10 rounded-full object-cover" /><div><p className="font-semibold text-sm text-gray-900">{profile.name}</p><p className="text-gray-400 text-xs">{profile.handle}</p></div></div>
          ))}
        </>}
      </div>
    </div>
  );
}

function EditProfileScreen({ profile, account, onBack, onSave }: { profile: UserProfile; account: { email: string } | null; onBack: () => void; onSave: (profile: Partial<UserProfile>) => void }) {
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const [desc, setDesc] = useState(profile.description);
  const [email, setEmail] = useState(account?.email ?? "");
  const [dob, setDob] = useState(profile.dob ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  // Re-sync all fields if profile loads after this screen mounts
  useEffect(() => {
    setName(profile.name);
    setUsername(profile.username);
    setAvatar(profile.avatar);
    setDesc(profile.description);
    setDob(profile.dob ?? "");
  }, [profile.name, profile.username, profile.avatar, profile.description, profile.dob]);

  useEffect(() => {
    if (account?.email) setEmail(account.email);
  }, [account?.email]);

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <BackArrow onPress={onBack} />
        <h2 className="font-bold text-base text-gray-900">Edit Profile</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-5">
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
              <PersonAvatar src={avatar} name={name || "Profile"} className="w-full h-full object-cover" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              readProfileImage(file, setAvatar);
            }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#1B2B6B" }} aria-label="Change profile picture">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
            </button>
          </div>
        </div>

        <TextInput label="Full Name" placeholder="Full Name" value={name} onChange={setName} />
        <TextInput label="Username" placeholder="Username" value={username} onChange={setUsername} />

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={5}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Tell people about yourself"
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl p-3 resize-none leading-relaxed"
          />
        </div>

        <TextInput label="Email Address" placeholder="Email" value={email} onChange={setEmail} type="email" />

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <div className="relative border-b border-gray-300">
            <input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              className="w-full bg-transparent py-2 text-sm text-gray-900"
            />
          </div>
        </div>
      </div>
      <div className="px-4 pb-10 pt-4">
        <PrimaryButton label="Save Changes" onClick={() => {
          onSave({
            name: name.trim(),
            username: username.trim(),
            avatar,
            description: desc.trim(),
            dob: dob.trim(),
            phone: profile.phone,
            gender: profile.gender,
          });
          onBack();
        }} />
      </div>
    </div>
  );
}

function CreateArticleScreen({ article, isDraft = false, onBack, onPublish, onSaveDraft }: { article?: Article; isDraft?: boolean; onBack: () => void; onPublish: (article: Omit<Article, "id" | "author" | "avatar" | "time">, id?: string) => void; onSaveDraft: (article: Omit<Article, "id" | "author" | "avatar" | "time">, id?: string) => void }) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [body, setBody] = useState(article?.body ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(article?.image ?? null);
  const [showDelete, setShowDelete] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filled = Boolean(title.trim() && body.trim());
  const draft = { title, body, category: "My Story", image: coverImage ?? "" };

  function saveDraft() {
    if (!filled) return;
    onSaveDraft(draft, article?.id);
    setDraftSaved(true);
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <StatusBar />
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <button onClick={() => { if (filled && !draftSaved) saveDraft(); onBack(); }} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-full" aria-label="Close article editor">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
              {isDraft && <span className="text-xs text-gray-400">Draft</span>}
              <button onClick={saveDraft} disabled={!filled} className="max-w-[150px] truncate text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium disabled:opacity-50" aria-label="Save article as draft">{draftSaved ? "Saved as draft" : "Save draft"}</button>
          {filled && (
            <button onClick={() => setShowDelete(true)} className="p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Cover image area */}
        <div
          className="mx-4 mt-4 rounded-2xl overflow-hidden flex items-center justify-center relative"
          style={{ height: 160, background: coverImage ? "#ffffff" : "#d1d5db" }}
        >
          {coverImage ? (
            <>
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(0,0,0,0.5)", color: "white" }}
                aria-label="Change cover image"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
                </svg>
                Change
              </button>
            </>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-1.5"
              aria-label="Add cover image"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#1B2B6B" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white">Add cover</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => setCoverImage(typeof reader.result === "string" ? reader.result : null);
          reader.readAsDataURL(file);
        }} />

        <div className="px-4 py-4">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-1">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Article Title"
              maxLength={150}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400"
            />
            <p className="text-right text-[10px] text-gray-400 mt-1">{title.length}/150</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-1">Article</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write you article here"
              maxLength={100000}
              rows={7}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 resize-none"
            />
            <p className="text-right text-[10px] text-gray-400 mt-1">{body.length}/100,000</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-10 pt-2">
        <PrimaryButton label="Publish" onClick={() => onPublish({ title, body, category: "My Story", image: coverImage ?? "" }, article?.id)} disabled={!filled} />
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="absolute inset-0 flex items-end justify-center z-20" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-t-3xl w-full px-6 py-8">
            <h3 className="font-bold text-xl text-gray-900 text-center mb-2">Delete Article</h3>
            <p className="text-gray-500 text-sm text-center mb-6">Are you sure you want to delete this article?</p>
            <div className="flex gap-3">
              <OutlineButton label="Cancel" onClick={() => setShowDelete(false)} />
              <PrimaryButton label="Delete" onClick={() => { setShowDelete(false); onBack(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleDetailScreen({ articleId, articles, onBack, following, onToggleFollowing, isSelf }: { articleId: string; articles: Article[]; onBack: () => void; following: boolean; onToggleFollowing: () => void; isSelf: boolean }) {
  const article = articles.find(a => a.id === articleId) ?? ARTICLES[1];

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center gap-2 px-4 py-2">
        <BackArrow onPress={onBack} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Cover */}
        <div className="h-52 bg-gray-200 overflow-hidden">
          <ArticleImage src={article.image} alt={article.title} className="w-full h-full object-cover" />
        </div>

        <div className="px-4 pt-5 pb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-snug">{article.title}</h1>

          {/* Author row */}
          <div className="flex items-center gap-3 mb-5">
            <PersonAvatar src={article.avatar} name={article.author} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">{article.author}</p>
              <p className="text-gray-400 text-xs">Published · {article.time}</p>
            </div>
            {!isSelf && <button
              onClick={onToggleFollowing}
              className="px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors"
              style={following
                ? { background: "#1B2B6B", borderColor: "#1B2B6B", color: "white" }
                : { background: "white", borderColor: "#1B2B6B", color: "#1B2B6B" }
              }
            >
              {following ? "Following" : "Follow"}
            </button>}
          </div>

          {/* Body */}
          {article.body.split("\n\n").map((p, i) => (
            <p key={i} className="text-gray-700 text-sm leading-relaxed mb-4 text-justify">{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function AppContent() {
  const { route, goTo, replace, goBack } = useAppRouter("splash");
  const screen = route as Screen;
  const [articleId, setArticleId] = useState("2");
  const [profilePerson, setProfilePerson] = useState<Person | null>(null);
  const [editingArticle, setEditingArticle] = useState<{ article: Article; isDraft: boolean } | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<{ article: Article; isDraft: boolean } | null>(null);
  const [accountDraft, setAccountDraft] = useState<AccountDraft>({ username: "", email: "", password: "", confirm: "" });
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ name: "", phone: "", gender: "", dob: "", avatar: null, description: "" });
  const { userArticles, publishedArticles, drafts, following, followingCounts, followerHandles, followingByUser, followersByUser, followers, publishArticle, saveDraft, updatePublished, deleteDraft, deletePublished, toggleFollowing, logout, createAccount, signIn, completeProfile, profile, registeredUsers, loading, account } = useVeriPress();
  const selfHandle = profile.username ? `@${profile.username}` : "";

  // Once loading finishes, redirect based on session state
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    if (profile.username) {
      replace("home");
    } else {
      replace("auth-options");
    }
  }, [loading, profile.username]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO_SRC} alt="VeriPress" width={64} height={64} className="object-contain" />
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#1B2B6B", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }
  const registeredPeople: Person[] = registeredUsers
    .filter(user => user.username.toLowerCase() !== profile.username.toLowerCase())
    .map(user => ({ name: user.name || user.username, handle: `@${user.username}`, avatar: user.avatar, following: Boolean(following[`@${user.username}`.toLowerCase()]) }));
  const registeredWriters: Person[] = registeredUsers
    .map(user => ({ name: user.name || user.username, handle: `@${user.username}`, avatar: user.avatar, following: Boolean(following[`@${user.username}`.toLowerCase()]) }));
  const discoverPeople = [...SUGGESTED_PEOPLE.filter(person => !registeredPeople.some(user => user.handle.toLowerCase() === person.handle.toLowerCase())), ...registeredPeople];
  function peopleForHandles(handles: string[]) {
    return handles.map(handle => {
      const user = registeredUsers.find(item => `@${item.username}`.toLowerCase() === handle.toLowerCase());
      if (user) {
        return { name: user.name || user.username, handle: `@${user.username}`, avatar: user.avatar, following: Boolean(following[handle.toLowerCase()]) };
      }
      // Fallback — user exists in accounts but not yet in profiles (incomplete profile)
      const rawUsername = handle.replace(/^@/, "");
      if (!rawUsername) return null;
      return { name: rawUsername, handle, avatar: null, following: Boolean(following[handle.toLowerCase()]) };
    }).filter((person): person is Person => person !== null);
  }

  function openArticle(id: string) {
    setArticleId(id);
    goTo("article-detail");
  }

  function openPublicProfile(nameOrHandle: string) {
    // Accept either a display name or @handle
    const isHandle = nameOrHandle.startsWith("@");
    const normalizedHandle = isHandle ? nameOrHandle.toLowerCase() : null;
    const normalizedName = nameOrHandle.toLowerCase();

    // 1. Try registered users — match by handle, username, or display name
    const registeredMatch = registeredUsers.find(user =>
      `@${user.username}`.toLowerCase() === normalizedHandle ||
      user.username.toLowerCase() === normalizedName ||
      (user.name && user.name.toLowerCase() === normalizedName)
    );
    if (registeredMatch) {
      setProfilePerson({
        name: registeredMatch.name || registeredMatch.username,
        handle: `@${registeredMatch.username}`,
        avatar: registeredMatch.avatar,
        following: Boolean(following[`@${registeredMatch.username}`.toLowerCase()]),
      });
      goTo("public-profile");
      return;
    }

    // 2. If we have a @handle, build the person directly from it even if not in registeredUsers
    //    (user exists in accounts but hasn't completed profile yet)
    if (isHandle) {
      const rawUsername = nameOrHandle.replace(/^@/, "");
      setProfilePerson({
        name: rawUsername,
        handle: nameOrHandle,
        avatar: null,
        following: Boolean(following[nameOrHandle.toLowerCase()]),
      });
      goTo("public-profile");
      return;
    }

    // 3. Fall back to SUGGESTED_PEOPLE
    const suggested = SUGGESTED_PEOPLE.find(person => person.name === nameOrHandle || person.handle === nameOrHandle);
    if (suggested) {
      setProfilePerson(suggested);
      goTo("public-profile");
      return;
    }

    // 4. Last resort: derive from a matching article
    const userArticle = publishedArticles.find(item => item.author === nameOrHandle || item.ownerUsername === nameOrHandle);
    const staticArticle = ARTICLES.find(item => item.author === nameOrHandle);
    const source = userArticle ?? staticArticle;
    if (source) {
      const handle = source.ownerUsername
        ? `@${source.ownerUsername}`
        : `@${source.author.toLowerCase().replaceAll(" ", "_")}`;
      setProfilePerson({
        name: source.author,
        handle,
        avatar: source.avatar,
        following: Boolean(following[handle.toLowerCase()]),
      });
      goTo("public-profile");
    }
  }

  const PROTECTED: Screen[] = ["home", "discover", "create-article", "my-articles", "profile", "edit-profile", "article-detail", "public-profile", "popular-articles", "top-writers", "new-articles", "following-list", "followers-list", "profile-articles"];

  const renderScreen = () => {
    // Always bounce unauthenticated users away from protected screens
    if (!profile.username && PROTECTED.includes(screen)) {
      return <AuthOptionsScreen onSignIn={() => replace("sign-in")} onSignUp={() => replace("create-account")} />;
    }

    switch (screen) {
      case "splash":
        return <SplashScreen onNext={() => goTo("onboarding")} />;
      case "onboarding":
        return <OnboardingScreen onSkip={() => goTo("auth-options")} onDone={() => goTo("auth-options")} />;
      case "auth-options":
        return <AuthOptionsScreen onSignIn={() => goTo("sign-in")} onSignUp={() => goTo("create-account")} />;
      case "sign-in":
        return <SignInScreen onBack={goBack} onSignIn={async (identifier, password) => { const valid = await signIn(identifier, password); if (valid) replace("home"); return valid; }} />;
      case "create-account":
        return <CreateAccountScreen draft={accountDraft} onDraftChange={setAccountDraft} onBack={() => { setAccountDraft({ username: "", email: "", password: "", confirm: "" }); setProfileDraft({ name: "", phone: "", gender: "", dob: "", avatar: null, description: "" }); goBack(); }} onContinue={async account => { const result = await createAccount(account); if (result === "created") goTo("complete-profile"); return result; }} />;
      case "complete-profile":
        return <CompleteProfileScreen draft={profileDraft} onDraftChange={setProfileDraft} onBack={goBack} onContinue={async nextProfile => { await completeProfile(nextProfile); setAccountDraft({ username: "", email: "", password: "", confirm: "" }); setProfileDraft({ name: "", phone: "", gender: "", dob: "", avatar: null, description: "" }); goTo("discover-people"); return true; }} />;
      case "discover-people":
        return <DiscoverPeopleScreen people={discoverPeople} onBack={goBack} onFinish={() => replace("home")} following={following} onToggleFollowing={toggleFollowing} onViewProfile={person => openPublicProfile(person.handle)} />;
      case "home":
        return <HomeScreen onNavigate={replace} onArticle={openArticle} onAuthor={openPublicProfile} userArticles={userArticles} />;
      case "discover":
        return <DiscoverScreen onNavigate={replace} onOpenList={goTo} onArticle={openArticle} onAuthor={openPublicProfile} publishedArticles={publishedArticles} registeredWriters={registeredWriters} />;
      case "popular-articles":
        return <DiscoverListScreen kind="popular" onBack={goBack} onArticle={openArticle} onAuthor={openPublicProfile} />;
      case "top-writers":
        return <DiscoverListScreen kind="writers" onBack={goBack} onArticle={openArticle} onAuthor={openPublicProfile} />;
      case "new-articles":
        return <DiscoverListScreen kind="new" onBack={goBack} onArticle={openArticle} onAuthor={openPublicProfile} />;
      case "following-list":
        return <ConnectionsScreen type="following" onBack={goBack} following={following} followers={followers} profile={profile} registeredUsers={registeredUsers} followerHandles={followerHandles} onViewProfile={person => openPublicProfile(person.handle)} />;
      case "followers-list":
        return <ConnectionsScreen type="followers" onBack={goBack} following={following} followers={followers} profile={profile} registeredUsers={registeredUsers} followerHandles={followerHandles} onViewProfile={person => openPublicProfile(person.handle)} />;
      case "profile-articles":
        return <ProfileArticlesScreen articles={userArticles} onBack={goBack} onArticle={openArticle} />;
      case "my-articles":
        return <MyArticlesScreen onNavigate={replace} onArticle={openArticle} userArticles={userArticles} drafts={drafts} onCreate={() => { setEditingArticle(null); replace("create-article"); }} onEdit={(article, isDraft) => { setEditingArticle({ article, isDraft }); replace("create-article"); }} onDelete={(article, isDraft) => setDeletingArticle({ article, isDraft })} />;
      case "profile":
        return <ProfileScreen onNavigate={replace} onEdit={() => goTo("edit-profile")} onEditArticle={article => { setEditingArticle({ article, isDraft: false }); replace("create-article"); }} onDeleteArticle={article => setDeletingArticle({ article, isDraft: false })} userArticles={userArticles} onLogout={() => { logout(); replace("auth-options"); }} following={following} followers={followers} profile={profile} registeredUsers={registeredUsers} onViewProfile={person => openPublicProfile(person.handle)} onViewConnections={type => goTo(type === "articles" ? "profile-articles" : type === "following" ? "following-list" : "followers-list")} />;
      case "edit-profile":
        return <EditProfileScreen profile={profile} account={account} onBack={goBack} onSave={completeProfile} />;
      case "create-article":
        return <CreateArticleScreen article={editingArticle?.article} isDraft={editingArticle?.isDraft} onBack={() => { setEditingArticle(null); replace("my-articles"); }} onSaveDraft={(article, id) => editingArticle && !editingArticle.isDraft && id ? updatePublished(id, article) : saveDraft(article, id)} onPublish={(article, id) => { publishArticle(article, id); setEditingArticle(null); replace("my-articles"); }} />;
      case "article-detail":
        {
          const article = [...publishedArticles, ...ARTICLES].find(item => item.id === articleId) ?? ARTICLES[1];
          const authorHandle = article.ownerUsername ? `@${article.ownerUsername}` : `@${article.author.toLowerCase().replaceAll(" ", "_")}`;
          const isSelfArticle = article.ownerUsername ? article.ownerUsername.toLowerCase() === profile.username.toLowerCase() : article.author.toLowerCase() === profile.name.toLowerCase() || authorHandle === selfHandle.toLowerCase();
          return <ArticleDetailScreen articleId={articleId} articles={[...publishedArticles, ...ARTICLES]} onBack={goBack} following={Boolean(following[authorHandle.toLowerCase()])} isSelf={isSelfArticle} onToggleFollowing={() => toggleFollowing(authorHandle)} />;
        }
      case "public-profile":
        return profilePerson ? <PublicProfileScreen person={profilePerson} articles={[...publishedArticles, ...ARTICLES].filter(article => article.ownerUsername?.toLowerCase() === profilePerson.handle.slice(1).toLowerCase() || (!article.ownerUsername && article.author === profilePerson.name))} followingPeople={peopleForHandles(Object.keys(followingByUser[profilePerson.handle.slice(1).toLowerCase()] ?? {}))} followerPeople={peopleForHandles(followersByUser[profilePerson.handle.slice(1).toLowerCase()] ?? [])} onBack={goBack} onArticle={openArticle} following={Boolean(following[profilePerson.handle.toLowerCase()])} followers={followers[profilePerson.handle.toLowerCase()] ?? 0} followingCount={followingCounts[profilePerson.handle.slice(1).toLowerCase()] ?? 0} isSelf={profilePerson.handle.toLowerCase() === selfHandle.toLowerCase()} onToggleFollowing={() => toggleFollowing(profilePerson.handle)} /> : null;
      default:
        return <SplashScreen onNext={() => goTo("onboarding")} />;
    }
  };

  return (
    <div className="h-full min-h-[100dvh] w-full flex items-center justify-center bg-gray-200" style={{ background: "#e5e7eb" }}>
      {/* Phone frame */}
      <div
        className="relative flex h-[100dvh] max-h-[844px] w-full max-w-[390px] flex-col overflow-hidden shadow-2xl"
        style={{
          borderRadius: "min(48px, 6vw)",
          background: "white",
        }}
      >
        {renderScreen()}
        {deletingArticle && (
          <DeleteArticleModal
            article={deletingArticle.article}
            isDraft={deletingArticle.isDraft}
            onCancel={() => setDeletingArticle(null)}
            onConfirm={() => { (deletingArticle.isDraft ? deleteDraft : deletePublished)(deletingArticle.article.id); setDeletingArticle(null); }}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <VeriPressProvider><AppContent /></VeriPressProvider>;
}
