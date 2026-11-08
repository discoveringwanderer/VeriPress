import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as api from "../api/veriPressApi";
import { supabase } from "../lib/supabase";
import type {
  Account,
  FollowersMap,
  FollowingMap,
  RegisteredUser,
  StoredArticle,
  UserProfile,
} from "../api/veriPressApi";

// ── re-export types so existing imports keep working ─────────────────────────
export type { Account, FollowersMap, FollowingMap, RegisteredUser, StoredArticle, UserProfile };

function formatContentTime(prefix: string) {
  return `${prefix} at ${new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())}`;
}

const BLANK_PROFILE: UserProfile = {
  name: "",
  username: "",
  avatar: null,
  description: "",
  phone: "",
  gender: "",
  dob: "",
};

type VeriPressContextValue = {
  // data
  userArticles: StoredArticle[];
  publishedArticles: StoredArticle[];
  drafts: StoredArticle[];
  following: FollowingMap;
  followingCounts: Record<string, number>;
  followerHandles: string[];
  followingByUser: Record<string, FollowingMap>;
  followersByUser: Record<string, string[]>;
  followers: FollowersMap;
  profile: UserProfile;
  registeredUsers: RegisteredUser[];
  account: Account | null;
  loading: boolean;
  loadError: string | null;
  signupNeedsConfirmation: boolean;
  // actions
  publishArticle: (
    article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">,
    id?: string
  ) => Promise<void>;
  saveDraft: (
    article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">,
    id?: string
  ) => Promise<void>;
  updateDraft: (
    id: string,
    article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">
  ) => Promise<void>;
  updatePublished: (
    id: string,
    article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">
  ) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  deletePublished: (id: string) => Promise<void>;
  toggleFollowing: (handle: string) => Promise<void>;
  logout: () => Promise<void>;
  createAccount: (
    account: { username: string; email: string; password: string }
  ) => Promise<"created" | "username-exists" | "email-exists" | "account-exists">;
  signIn: (identifier: string, password: string) => Promise<boolean>;
  completeProfile: (profile: Partial<UserProfile>) => Promise<void>;
  validateCredentials: (identifier: string, password: string) => Promise<boolean>;
};

const VeriPressContext = createContext<VeriPressContextValue | null>(null);

export function VeriPressProvider({ children }: { children: React.ReactNode }) {
  const [publishedArticles, setPublishedArticles] = useState<StoredArticle[]>([]);
  const [drafts, setDrafts] = useState<StoredArticle[]>([]);
  const [profile, setProfile] = useState<UserProfile>(BLANK_PROFILE);
  const [account, setAccount] = useState<Account | null>(null);
  const [following, setFollowing] = useState<FollowingMap>({});
  const [followers, setFollowers] = useState<FollowersMap>({});
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [followingByUser, setFollowingByUser] = useState<Record<string, FollowingMap>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signupNeedsConfirmation, setSignupNeedsConfirmation] = useState(false);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [allArticles, allRegistered, allFollowingByUser, allFollowers] = await Promise.all([
          api.getUserArticles(),
          api.getRegisteredUsers(),
          api.getFollowingByUser(),
          api.getFollowerCounts(),
        ]);
        setPublishedArticles(allArticles);
        setRegisteredUsers(allRegistered);
        setFollowingByUser(allFollowingByUser);
        setFollowers(allFollowers);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (session?.user) {
          const email = session.user.email;
          if (!email) throw new Error("The signed-in account does not have an email address.");
          const acc = await api.getAccountByAuthUserId(session.user.id)
            ?? await api.getAccountByIdentifier(email);
          if (!acc) throw new Error("No VeriPress profile is linked to this signed-in account.");
          if (acc.authUserId && acc.authUserId !== session.user.id) {
            await supabase.auth.signOut();
            throw new Error("This sign-in does not match the VeriPress account linked to this email.");
          }
          if (acc.authUserId !== session.user.id) {
            await api.saveAccount({ ...acc, authUserId: session.user.id });
          }
          const savedProfile = await api.getProfileForUser(acc.username);
          const restoredProfile = savedProfile ?? { ...BLANK_PROFILE, username: acc.username };
          const [userFollowing, userDrafts] = await Promise.all([
            api.getFollowingForUser(acc.username),
            api.getDrafts(acc.username),
          ]);
          setAccount({ ...acc, authUserId: session.user.id });
          setProfile(restoredProfile);
          setFollowing(userFollowing);
          setDrafts(userDrafts);
        }
      } finally {
        setLoading(false);
      }
    }
    void init().catch((error: unknown) => {
      console.error("Unable to load VeriPress data.", error);
      setLoadError("Unable to load VeriPress data. Check your connection and Supabase setup, then try again.");
    });
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────────
  const author = profile.name.trim() || profile.username.trim() || "Your Profile";
  const avatar = profile.avatar ?? "";
  const userArticles = publishedArticles.filter((item) =>
    item.ownerUsername
      ? item.ownerUsername.toLowerCase() === profile.username.toLowerCase()
      : item.author === author
  );

  // Build allFollowing with every registered user seeded
  const allFollowing: Record<string, FollowingMap> = {};
  registeredUsers.forEach((u) => { allFollowing[u.username.toLowerCase()] = {}; });
  Object.entries(followingByUser).forEach(([username, map]) => {
    allFollowing[username.toLowerCase()] = map;
  });
  if (profile.username) allFollowing[profile.username.toLowerCase()] = following;

  const actualFollowers: FollowersMap = {};
  Object.values(allFollowing).forEach((map) =>
    Object.entries(map).forEach(([handle, isFollowing]) => {
      if (isFollowing)
        actualFollowers[handle.toLowerCase()] = (actualFollowers[handle.toLowerCase()] ?? 0) + 1;
    })
  );

  const followingCounts = Object.fromEntries(
    Object.entries(allFollowing).map(([u, map]) => [u, Object.values(map).filter(Boolean).length])
  );

  const followerHandles = Object.entries(allFollowing)
    .filter(([, map]) => Boolean(map[`@${profile.username}`.toLowerCase()]))
    .map(([u]) => `@${u}`);

  const followersByUser = Object.fromEntries(
    Object.keys(allFollowing).map((username) => [
      username,
      Object.entries(allFollowing)
        .filter(([, map]) => Boolean(map[`@${username}`]))
        .map(([followerUsername]) => `@${followerUsername}`),
    ])
  );

  // ── Refresh helpers ──────────────────────────────────────────────────────────
  const refreshGlobal = useCallback(async () => {
    const [allArticles, allRegistered, allFollowingByUser, allFollowers, activeFollowing] = await Promise.all([
      api.getUserArticles(),
      api.getRegisteredUsers(),
      api.getFollowingByUser(),
      api.getFollowerCounts(),
      profile.username ? api.getFollowingForUser(profile.username) : Promise.resolve(null),
    ]);
    setPublishedArticles(allArticles);
    setRegisteredUsers(allRegistered);
    setFollowingByUser(allFollowingByUser);
    setFollowers(allFollowers);
    if (activeFollowing) setFollowing(activeFollowing);
  }, [profile.username]);

  useEffect(() => {
    let refreshTimer: number | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void refreshGlobal().catch((error: unknown) => {
        console.error("Unable to refresh community data.", error);
      });
    };
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refresh, 150);
    };
    const unsubscribe = api.subscribeToSocialUpdates(scheduleRefresh);
    const interval = window.setInterval(refresh, 15000);

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
      window.clearTimeout(refreshTimer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshGlobal]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const createAccount = useCallback(async (
    nextAccount: { username: string; email: string; password: string }
  ): Promise<"created" | "username-exists" | "email-exists" | "account-exists"> => {
    const existing = await api.getAccounts();
    const sameUsername = existing.find((a) => a.username.toLowerCase() === nextAccount.username.toLowerCase());
    const sameEmail = existing.find((a) => a.email.toLowerCase() === nextAccount.email.toLowerCase());
    if (sameUsername && sameUsername.email.toLowerCase() !== nextAccount.email.toLowerCase())
      return "username-exists";
    if (sameEmail && sameEmail.username.toLowerCase() !== nextAccount.username.toLowerCase())
      return "email-exists";
    const email = nextAccount.email.trim().toLowerCase();
    let { data: authData, error } = await supabase.auth.signUp({
      email,
      password: nextAccount.password,
      options: { data: { username: nextAccount.username } },
    });
    if (error) throw error;

    if (!authData.user || authData.user.identities?.length === 0) {
      const existingAccount = sameEmail ?? sameUsername;
      const authUsername = authData.user?.user_metadata.username;
      if (!authData.user || (authUsername && authUsername.toLowerCase() !== nextAccount.username.toLowerCase())) {
        return "account-exists";
      }
      const { data: existingAuth, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: nextAccount.password,
      });
      if (signInError) {
        if (signInError.code === "email_not_confirmed") {
          const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
          if (resendError) throw resendError;
          const savedAccount: Account = {
            username: existingAccount?.username ?? nextAccount.username,
            email,
            authUserId: authData.user.id,
          };
          await api.saveAccount(savedAccount);
          setAccount(savedAccount);
          setProfile({ ...BLANK_PROFILE, username: savedAccount.username });
          setSignupNeedsConfirmation(true);
          return "created";
        }
        if (signInError.code === "invalid_credentials") return "account-exists";
        throw signInError;
      }
      if (!existingAuth.user) return "account-exists";
      const existingUsername = existingAuth.user.user_metadata.username;
      if (existingUsername && existingUsername.toLowerCase() !== nextAccount.username.toLowerCase()) {
        await supabase.auth.signOut();
        return "account-exists";
      }
      if (existingAccount?.authUserId === existingAuth.user.id) {
        await supabase.auth.signOut();
        return "account-exists";
      }
      authData = existingAuth;
    }
    if (!authData.user) return "account-exists";
    const savedAccount: Account = {
      username: sameUsername?.username ?? nextAccount.username,
      email,
      authUserId: authData.user.id,
    };
    await api.saveAccount(savedAccount);
    await api.saveAccount(savedAccount);
    setAccount(savedAccount);
    setProfile({ ...BLANK_PROFILE, username: savedAccount.username });
    setSignupNeedsConfirmation(!authData.session);
    return "created";
  }, []);

  const signIn = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    const matched = await api.getAccountByIdentifier(identifier);
    if (!matched) return false;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: matched.email,
      password,
    });
    if (error) {
      if (error.code === "invalid_credentials") return false;
      if (error.code === "email_not_confirmed") {
        throw new Error("Please confirm your email address before signing in.");
      }
      throw error;
    }
    if (!data.user || (matched.authUserId && matched.authUserId !== data.user.id)) {
      await supabase.auth.signOut();
      throw new Error("This sign-in does not match the VeriPress account linked to this email.");
    }
    const matchedAccount = { ...matched, authUserId: data.user.id };
    await api.saveAccount(matchedAccount);

    const [savedProfile, userFollowing, userDrafts, allArticles, allRegistered, allFollowingByUser, allFollowers] =
      await Promise.all([
        api.getProfileForUser(matchedAccount.username),
        api.getFollowingForUser(matchedAccount.username),
        api.getDrafts(matchedAccount.username),
        api.getUserArticles(),
        api.getRegisteredUsers(),
        api.getFollowingByUser(),
        api.getFollowerCounts(),
      ]);

    const nextProfile: UserProfile = savedProfile ?? {
      ...BLANK_PROFILE,
      username: matchedAccount.username,
    };

    setAccount(matchedAccount);
    setProfile(nextProfile);
    setSignupNeedsConfirmation(false);
    setFollowing(userFollowing);
    setDrafts(userDrafts);
    setPublishedArticles(allArticles);
    setRegisteredUsers(allRegistered);
    setFollowingByUser(allFollowingByUser);
    setFollowers(allFollowers);

    return true;
  }, []);

  const completeProfile = useCallback(async (nextProfile: Partial<UserProfile>): Promise<void> => {
    const next: UserProfile = { ...profile, ...nextProfile };
    const usernameChanged =
      next.username.trim().toLowerCase() !== profile.username.trim().toLowerCase();
    if (usernameChanged) {
      const ok = await api.renameAccountUsername(profile.username, next.username);
      if (!ok) throw new Error("That username is already in use.");
    }

    await api.saveProfileForUser(next.username, next);

    // Update articles and drafts author info
    const updatedArticles = publishedArticles.map((item) =>
      item.ownerUsername?.toLowerCase() === profile.username.toLowerCase() ||
      (!item.ownerUsername && item.author === author)
        ? { ...item, author: next.name || next.username, avatar: next.avatar ?? "", ownerUsername: next.username }
        : item
    );
    for (const a of updatedArticles.filter(
      (a) => a.ownerUsername?.toLowerCase() === next.username.toLowerCase()
    )) {
      await api.saveArticle(a);
    }

    const updatedDrafts = drafts.map((item) => ({
      ...item,
      author: next.name || next.username,
      avatar: next.avatar ?? "",
      ownerUsername: next.username,
    }));
    for (const d of updatedDrafts) await api.saveDraft(d);

    setProfile(next);
    setPublishedArticles(updatedArticles);
    setDrafts(updatedDrafts);

    // Sync registered users
    await refreshGlobal();
  }, [profile, author, publishedArticles, drafts, refreshGlobal]);

  const publishArticle = useCallback(async (
    articleData: Omit<StoredArticle, "id" | "author" | "avatar" | "time">,
    id?: string
  ): Promise<void> => {
    const article: StoredArticle = {
      ...articleData,
      id: id ?? `user-${Date.now()}`,
      author,
      avatar,
      ownerUsername: profile.username,
      time: formatContentTime("Uploaded"),
    };
    await api.saveArticle(article);
    if (id) {
      await api.deleteDraft(id);
      setDrafts((current) => current.filter((d) => d.id !== id));
    }
    setPublishedArticles((current) => [article, ...current.filter((a) => a.id !== article.id)]);
  }, [author, avatar, profile.username]);

  const saveDraftFn = useCallback(async (
    articleData: Omit<StoredArticle, "id" | "author" | "avatar" | "time">,
    id?: string
  ): Promise<void> => {
    const draft: StoredArticle = {
      ...articleData,
      id: id ?? `draft-${Date.now()}`,
      author,
      avatar,
      ownerUsername: profile.username,
      time: formatContentTime("Drafted"),
    };
    await api.saveDraft(draft);
    setDrafts((current) =>
      id
        ? current.map((d) => (d.id === id ? draft : d))
        : [draft, ...current]
    );
  }, [author, avatar, profile.username]);

  const updateDraft = useCallback(async (
    id: string,
    articleData: Omit<StoredArticle, "id" | "author" | "avatar" | "time">
  ): Promise<void> => {
    const draft: StoredArticle = {
      ...articleData,
      id,
      author,
      avatar,
      ownerUsername: profile.username,
      time: formatContentTime("Drafted"),
    };
    await api.saveDraft(draft);
    setDrafts((current) => current.map((d) => (d.id === id ? draft : d)));
  }, [author, avatar, profile.username]);

  const updatePublished = useCallback(async (
    id: string,
    articleData: Omit<StoredArticle, "id" | "author" | "avatar" | "time">
  ): Promise<void> => {
    const article: StoredArticle = {
      ...articleData,
      id,
      author,
      avatar,
      ownerUsername: profile.username,
      time: formatContentTime("Uploaded"),
    };
    await api.saveArticle(article);
    setPublishedArticles((current) => current.map((a) => (a.id === id ? article : a)));
  }, [author, avatar, profile.username]);

  const deleteDraftFn = useCallback(async (id: string): Promise<void> => {
    await api.deleteDraft(id);
    setDrafts((current) => current.filter((d) => d.id !== id));
  }, []);

  const deletePublished = useCallback(async (id: string): Promise<void> => {
    await api.deleteArticle(id);
    setPublishedArticles((current) => current.filter((a) => a.id !== id));
  }, []);

  const toggleFollowing = useCallback(async (handle: string): Promise<void> => {
    if (!profile.username) return;
    if (handle.toLowerCase() === `@${profile.username.toLowerCase()}`) return;

    // Strip @ to get raw username for Supabase
    const targetUsername = handle.replace(/^@/, "");
    if (!targetUsername) return;

    const isFollowing = Boolean(following[handle.toLowerCase()]);
    if (isFollowing) {
      await api.unfollowUser(profile.username, handle);
    } else {
      await api.followUser(profile.username, handle);
    }

    const [newFollowing, newFollowingByUser, newFollowers] = await Promise.all([
      api.getFollowingForUser(profile.username),
      api.getFollowingByUser(),
      api.getFollowerCounts(),
    ]);
    setFollowing(newFollowing);
    setFollowingByUser(newFollowingByUser);
    setFollowers(newFollowers);
  }, [profile.username, following]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(BLANK_PROFILE);
    setAccount(null);
    setSignupNeedsConfirmation(false);
    setFollowing({});
    setDrafts([]);
  }, []);

  const validateCredentials = useCallback(async (
    identifier: string,
    password: string
  ): Promise<boolean> => {
    const matched = await api.getAccountByIdentifier(identifier);
    if (!matched) return false;
    const { error } = await supabase.auth.signInWithPassword({ email: matched.email, password });
    if (error?.code === "invalid_credentials") return false;
    if (error) throw error;
    return true;
  }, []);

  return (
    <VeriPressContext.Provider
      value={{
        userArticles,
        publishedArticles,
        drafts,
        following,
        followingCounts,
        followerHandles,
        followingByUser: allFollowing,
        followersByUser,
        followers: actualFollowers,
        profile,
        registeredUsers,
        account,
        loading,
        loadError,
        signupNeedsConfirmation,
        publishArticle,
        saveDraft: saveDraftFn,
        updateDraft,
        updatePublished,
        deleteDraft: deleteDraftFn,
        deletePublished,
        toggleFollowing,
        logout,
        createAccount,
        signIn,
        completeProfile,
        validateCredentials,
      }}
    >
      {children}
    </VeriPressContext.Provider>
  );
}

export function useVeriPress() {
  const context = useContext(VeriPressContext);
  if (!context) throw new Error("useVeriPress must be used inside VeriPressProvider");
  return context;
}
