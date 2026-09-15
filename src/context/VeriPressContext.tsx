import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as api from "../api/veriPressApi";
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
  logout: () => void;
  createAccount: (
    account: Account
  ) => Promise<"created" | "username-exists" | "email-exists">;
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

  // Keep a ref to the active session so we can restore on reload
  const sessionKey = "veripress.session-username";

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

        // Restore session if user was previously signed in
        const savedUsername = window.localStorage.getItem(sessionKey);
        if (savedUsername) {
          const savedProfile = await api.getProfileForUser(savedUsername);
          if (savedProfile) {
            setProfile(savedProfile);
            const acc = await api.getAccountByIdentifier(savedUsername);
            if (acc) setAccount(acc);
            const userFollowing = await api.getFollowingForUser(savedUsername);
            setFollowing(userFollowing);
            const userDrafts = await api.getDrafts(savedUsername);
            setDrafts(userDrafts);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    init();
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
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const createAccount = useCallback(async (
    nextAccount: Account
  ): Promise<"created" | "username-exists" | "email-exists"> => {
    const existing = await api.getAccounts();
    if (existing.some((a) => a.username.toLowerCase() === nextAccount.username.toLowerCase()))
      return "username-exists";
    if (existing.some((a) => a.email.toLowerCase() === nextAccount.email.toLowerCase()))
      return "email-exists";
    await api.saveAccount(nextAccount);
    return "created";
  }, []);

  const signIn = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    const normalizedPassword = password.trim();
    const matched = await api.getAccountByIdentifier(identifier);

    let matchedAccount: Account | null = null;

    if (matched && matched.password === normalizedPassword) {
      matchedAccount = matched;
    } else {
      // Fallback: orphaned registered user with no account record
      const freshUsers = await api.getRegisteredUsers();
      const orphan = freshUsers.find(
        (u) => u.username.toLowerCase() === identifier.trim().toLowerCase()
      );
      if (orphan) {
        const existing = await api.getAccounts();
        if (!existing.some((a) => a.username.toLowerCase() === orphan.username.toLowerCase())) {
          const recovered: Account = {
            username: orphan.username,
            email: `${orphan.username}@veripress.local`,
            password: normalizedPassword,
          };
          await api.saveAccount(recovered);
          matchedAccount = recovered;
        }
      }
    }

    if (!matchedAccount) return false;

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
    setFollowing(userFollowing);
    setDrafts(userDrafts);
    setPublishedArticles(allArticles);
    setRegisteredUsers(allRegistered);
    setFollowingByUser(allFollowingByUser);
    setFollowers(allFollowers);

    // Persist session
    window.localStorage.setItem(sessionKey, matchedAccount.username);
    return true;
  }, []);

  const completeProfile = useCallback(async (nextProfile: Partial<UserProfile>): Promise<void> => {
    const next: UserProfile = { ...profile, ...nextProfile };
    const usernameChanged =
      next.username.trim().toLowerCase() !== profile.username.trim().toLowerCase();
    if (usernameChanged) {
      const ok = await api.renameAccountUsername(profile.username, next.username);
      if (!ok) return;
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

    if (profile.username) {
      window.localStorage.setItem(sessionKey, next.username);
    }

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
    // Remove from drafts if promoting
    if (id) {
      await api.deleteDraft(id);
      setDrafts((current) => current.filter((d) => d.id !== id));
    }
    await api.saveArticle(article);
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

    const knownHandles = new Set(registeredUsers.map((u) => `@${u.username}`.toLowerCase()));
    if (!knownHandles.has(handle.toLowerCase())) return;

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
  }, [profile.username, following, registeredUsers]);

  const logout = useCallback(() => {
    window.localStorage.removeItem(sessionKey);
    setProfile(BLANK_PROFILE);
    setAccount(null);
    setFollowing({});
    setDrafts([]);
  }, []);

  const validateCredentials = useCallback(async (
    identifier: string,
    password: string
  ): Promise<boolean> => {
    const matched = await api.getAccountByIdentifier(identifier);
    return Boolean(matched && matched.password === password.trim());
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
