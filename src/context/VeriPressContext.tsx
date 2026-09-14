import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Account, FollowersMap, FollowingMap, RegisteredUser, StoredArticle, UserProfile, veriPressApi } from "../api/veriPressApi";

function formatContentTime(prefix: string) {
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
  return `${prefix} at ${time}`;
}

function getRegisteredFollowing(defaultFollowing: FollowingMap, username: string) {
  const registeredHandles = new Set(veriPressApi.getRegisteredUsers().map(user => `@${user.username}`.toLowerCase()));
  const storedFollowing = veriPressApi.getFollowing(defaultFollowing, username);
  return Object.fromEntries(Object.entries(storedFollowing).filter(([handle, isFollowing]) => registeredHandles.has(handle.toLowerCase()) && isFollowing).map(([handle, isFollowing]) => [handle.toLowerCase(), isFollowing]));
}

type VeriPressContextValue = {
  userArticles: StoredArticle[];
  publishedArticles: StoredArticle[];
  drafts: StoredArticle[];
  following: FollowingMap;
  followingCounts: Record<string, number>;
  followerHandles: string[];
  followingByUser: Record<string, FollowingMap>;
  followersByUser: Record<string, string[]>;
  followers: FollowersMap;
  publishArticle: (article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">, id?: string) => void;
  saveDraft: (article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">, id?: string) => void;
  updateDraft: (id: string, article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">) => void;
  updatePublished: (id: string, article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">) => void;
  deleteDraft: (id: string) => void;
  deletePublished: (id: string) => void;
  toggleFollowing: (handle: string) => void;
  logout: () => void;
  account: Account | null;
  createAccount: (account: Account) => "created" | "username-exists" | "email-exists" | "account-exists";
  signIn: (identifier: string, password: string) => boolean;
  validateCredentials: (identifier: string, password: string) => boolean;
  completeProfile: (profile: Partial<UserProfile>) => void;
  profile: UserProfile;
  registeredUsers: RegisteredUser[];
};

const VeriPressContext = createContext<VeriPressContextValue | null>(null);

export function VeriPressProvider({ children, defaultFollowing }: { children: React.ReactNode; defaultFollowing: FollowingMap }) {
  const defaultAvatar = null;
  const [publishedArticles, setPublishedArticles] = useState<StoredArticle[]>(() => veriPressApi.getUserArticles());
  const [drafts, setDrafts] = useState<StoredArticle[]>(() => veriPressApi.getDrafts());
  const [account, setAccount] = useState<Account | null>(() => veriPressApi.getAccount());
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<UserProfile>(() => {
    // Only restore the saved profile if there is an active session account.
    // Without this guard a new user's registration would inherit the previous
    // user's profile data (including their username), corrupting completeProfile.
    const activeAccount = veriPressApi.getAccount();
    if (!activeAccount) return { name: "", username: "", avatar: null, description: "", phone: "", gender: "", dob: "" };
    const saved = veriPressApi.getProfileForUser(activeAccount.username) ?? veriPressApi.getProfile();
    // Ensure the username always matches the active account.
    return { ...saved, username: activeAccount.username };
  });
  const [following, setFollowing] = useState<FollowingMap>(() => getRegisteredFollowing(defaultFollowing, veriPressApi.getProfile().username || "guest"));
  const [followers, setFollowers] = useState<FollowersMap>(() => veriPressApi.getFollowerCounts());
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => veriPressApi.getRegisteredUsers());

  const author = profile.name.trim() || profile.username.trim() || "Your Profile";
  const avatar = profile.avatar ?? defaultAvatar;
  const userArticles = publishedArticles.filter(item => item.ownerUsername ? item.ownerUsername.toLowerCase() === profile.username.toLowerCase() : item.author === author);
  const registeredHandles = new Set(registeredUsers.map(user => `@${user.username}`.toLowerCase()));
  // Seed every registered user as a key so followingCounts and followersByUser are never missing
  // entries for users who have never followed anyone.
  const storedFollowing = veriPressApi.getFollowingByUser();
  const allFollowing: Record<string, FollowingMap> = {};
  registeredUsers.forEach(user => { allFollowing[user.username.toLowerCase()] = {}; });
  Object.entries(storedFollowing)
    .filter(([username]) => profile.username ? username !== "guest" : true)
    .forEach(([username, userFollowing]) => {
      allFollowing[username.toLowerCase()] = Object.fromEntries(
        Object.entries(userFollowing)
          .filter(([handle, isFollowing]) => registeredHandles.has(handle.toLowerCase()) && isFollowing)
          .map(([handle, isFollowing]) => [handle.toLowerCase(), isFollowing])
      );
    });
  allFollowing[profile.username.toLowerCase()] = following;
  const actualFollowers: FollowersMap = {};
  Object.values(allFollowing).forEach(userFollowing => Object.entries(userFollowing).forEach(([handle, isFollowing]) => {
    if (isFollowing) actualFollowers[handle.toLowerCase()] = (actualFollowers[handle.toLowerCase()] ?? 0) + 1;
  }));
  const followingCounts = Object.fromEntries(Object.entries(allFollowing).map(([username, userFollowing]) => [username, Object.values(userFollowing).filter(Boolean).length]));
  const followerHandles = Object.entries(allFollowing)
    .filter(([, userFollowing]) => Boolean(userFollowing[`@${profile.username}`.toLowerCase()]))
    .map(([username]) => `@${username}`);
  // Expand followersByUser to cover every registered user as a key, including those who have
  // never followed anyone (they still appear in allFollowing due to the seed above).
  const followersByUser = Object.fromEntries(Object.keys(allFollowing).map(username => [
    username,
    Object.entries(allFollowing)
      .filter(([, userFollowing]) => Boolean(userFollowing[`@${username}`]))
      .map(([followerUsername]) => `@${followerUsername}`),
  ]));

  useEffect(() => veriPressApi.saveUserArticles(publishedArticles), [publishedArticles]);
  useEffect(() => veriPressApi.saveDrafts(drafts), [drafts]);
  useEffect(() => veriPressApi.saveFollowing(following, profile.username || "guest"), [following, profile.username]);
  useEffect(() => veriPressApi.saveFollowers(followers), [followers]);
  useEffect(() => {
    veriPressApi.saveProfile(profile);
    if (profile.username) veriPressApi.saveProfileForUser(profile.username, profile);
  }, [profile]);
  useEffect(() => veriPressApi.saveRegisteredUsers(registeredUsers), [registeredUsers]);

  useEffect(() => {
    setPublishedArticles(current => current.map(item => item.ownerUsername?.toLowerCase() === profile.username.toLowerCase() || (!item.ownerUsername && item.author === author) ? { ...item, author, avatar, ownerUsername: profile.username } : item));
    setDrafts(current => current.map(item => ({ ...item, author, avatar })));
  }, [author, avatar, profile.username]);

  const value = useMemo(() => ({
    userArticles,
    publishedArticles,
    drafts,
    following,
    followingCounts,
    followerHandles,
    followingByUser: allFollowing,
    followersByUser,
    followers: actualFollowers,
    account,
    profile,
    registeredUsers,
    completeProfile: (nextProfile: Partial<UserProfile>) => {
      const next = { ...profile, ...nextProfile, username: pendingAccount?.username ?? profile.username };
      const usernameChanged = next.username.trim().toLowerCase() !== profile.username.trim().toLowerCase();
      if (usernameChanged && !veriPressApi.renameAccountUsername(profile.username, next.username)) return;
      const nextAuthor = next.name.trim() || next.username.trim() || "Your Profile";
      const nextAvatar = next.avatar ?? defaultAvatar;
      if (pendingAccount) {
        // Account was already written to storage eagerly in createAccount.
        // Just update the active-session pointer and state.
        veriPressApi.saveAccount(pendingAccount);
        setAccount(pendingAccount);
        setFollowing(getRegisteredFollowing(defaultFollowing, pendingAccount.username));
        setFollowers(veriPressApi.getFollowerCounts());
        setPendingAccount(null);
      }
      setProfile(next);
      if (!pendingAccount && usernameChanged && account) {
        const updatedAccount = { ...account, username: next.username };
        veriPressApi.saveAccount(updatedAccount);
        setAccount(updatedAccount);
      }
      setRegisteredUsers(current => {
        const previousUsername = profile.username;
        // Also deduplicate by the new username to handle cases where the same
        // user registered twice or registered-users got duplicated.
        const updated = current.filter(user =>
          user.username.toLowerCase() !== previousUsername.toLowerCase() &&
          user.username.toLowerCase() !== next.username.toLowerCase()
        );
        return [...updated, { username: next.username, name: next.name, avatar: next.avatar, description: next.description }];
      });
      setPublishedArticles(current => current.map(item => item.ownerUsername?.toLowerCase() === profile.username.toLowerCase() || (!item.ownerUsername && item.author === author) ? { ...item, author: nextAuthor, avatar: nextAvatar, ownerUsername: next.username } : item));
      setDrafts(current => current.map(item => ({ ...item, author: nextAuthor, avatar: nextAvatar })));
    },
    createAccount: (nextAccount: Account) => {
      // Always read fresh from storage to catch accounts registered in other sessions.
      const existingAccounts = veriPressApi.getAccounts();
      if (existingAccounts.some(existing => existing.username.toLowerCase() === nextAccount.username.toLowerCase())) return "username-exists" as const;
      if (existingAccounts.some(existing => existing.email.toLowerCase() === nextAccount.email.toLowerCase())) return "email-exists" as const;
      // Eagerly persist the account now so sign-in works even if the user
      // refreshes before completing the profile step.
      veriPressApi.saveAccounts([...existingAccounts, nextAccount]);
      setPendingAccount(nextAccount);
      return "created" as const;
    },
    signIn: (identifier: string, password: string) => {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      const normalizedPassword = password.trim();
      // Always read accounts fresh from storage (covers cross-session registrations).
      const accounts = veriPressApi.getAccounts();
      let matchedAccount = accounts.find(stored =>
        (stored.email.toLowerCase() === normalizedIdentifier ||
          stored.username.toLowerCase() === normalizedIdentifier) &&
        stored.password === normalizedPassword
      );

      // Fallback: if no account record exists yet (registered before the eager-save fix),
      // accept any registered username/email match and reconstruct the account record.
      if (!matchedAccount) {
        const freshRegisteredUsers = veriPressApi.getRegisteredUsers();
        const orphanedUser = freshRegisteredUsers.find(user =>
          user.username.toLowerCase() === normalizedIdentifier
        );
        if (orphanedUser && !accounts.some(a => a.username.toLowerCase() === orphanedUser.username.toLowerCase())) {
          // Reconstruct and save the missing account so future logins work normally.
          const recoveredAccount: Account = { username: orphanedUser.username, email: `${orphanedUser.username}@veripress.local`, password: normalizedPassword };
          veriPressApi.saveAccounts([...accounts, recoveredAccount]);
          matchedAccount = recoveredAccount;
        }
      }

      if (!matchedAccount) return false;

      // Read registeredUsers fresh from storage in case state is stale.
      const freshRegisteredUsers = veriPressApi.getRegisteredUsers();
      const matchedUser = freshRegisteredUsers.find(user => user.username.toLowerCase() === matchedAccount!.username.toLowerCase());

      // Load this user's own saved profile, then overlay registered-user fields
      // so name/avatar/description are always up to date.
      const storedProfile = veriPressApi.getProfileForUser(matchedAccount.username);
      const baseProfile: UserProfile = storedProfile ?? {
        name: matchedUser?.name ?? "",
        username: matchedAccount.username,
        avatar: matchedUser?.avatar ?? null,
        description: matchedUser?.description ?? "",
        phone: "",
        gender: "",
        dob: "",
      };
      const nextProfile: UserProfile = {
        ...baseProfile,
        username: matchedAccount.username,
        // Always sync name/avatar/description from the registered-user record
        // so edits made via completeProfile are reflected correctly.
        name: matchedUser?.name ?? baseProfile.name,
        avatar: matchedUser?.avatar !== undefined ? matchedUser.avatar : baseProfile.avatar,
        description: matchedUser?.description ?? baseProfile.description,
      };

      veriPressApi.saveAccount(matchedAccount);
      setAccount(matchedAccount);
      setRegisteredUsers(freshRegisteredUsers);
      setFollowing(getRegisteredFollowing(defaultFollowing, matchedAccount.username));
      setFollowers(veriPressApi.getFollowerCounts());
      // Reload all published articles from storage so articles published by other users
      // in previous sessions are always visible to the newly signed-in user.
      setPublishedArticles(veriPressApi.getUserArticles());
      // Fully replace profile state — never spread over the previous user's data.
      setProfile(nextProfile);
      if (matchedUser?.name) {
        setDrafts(veriPressApi.getDrafts().filter(draft => draft.author === matchedUser.name || draft.ownerUsername?.toLowerCase() === matchedAccount!.username.toLowerCase()));
      } else {
        setDrafts([]);
      }
      return true;
    },
    validateCredentials: (identifier: string, password: string) => {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      return veriPressApi.getAccounts().some(stored => (stored.email.toLowerCase() === normalizedIdentifier || stored.username.toLowerCase() === normalizedIdentifier) && stored.password === password);
    },
    publishArticle: (article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">, id?: string) => {
      setDrafts(current => id ? current.filter(item => item.id !== id) : current);
      setPublishedArticles(current => id ? [{ ...article, id, author, avatar, ownerUsername: profile.username, time: formatContentTime("Uploaded") }, ...current.filter(item => item.id !== id)] : [{ ...article, id: `user-${Date.now()}`, author, avatar, ownerUsername: profile.username, time: formatContentTime("Uploaded") }, ...current]);
    },
    saveDraft: (article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">, id?: string) => {
      setDrafts(current => id ? current.map(item => item.id === id ? { ...item, ...article, author, avatar, time: formatContentTime("Drafted") } : item) : [{ ...article, id: `draft-${Date.now()}`, author, avatar, time: formatContentTime("Drafted") }, ...current]);
    },
    updateDraft: (id: string, article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">) => setDrafts(current => current.map(item => item.id === id ? { ...item, ...article, author, avatar, time: formatContentTime("Drafted") } : item)),
    updatePublished: (id: string, article: Omit<StoredArticle, "id" | "author" | "avatar" | "time">) => setPublishedArticles(current => current.map(item => item.id === id ? { ...item, ...article, author, avatar, ownerUsername: profile.username, time: formatContentTime("Uploaded") } : item)),
    deleteDraft: (id: string) => setDrafts(current => current.filter(item => item.id !== id)),
    deletePublished: (id: string) => setPublishedArticles(current => current.filter(item => item.id !== id)),
    toggleFollowing: (handle: string) => {
      if (profile.username && handle.toLowerCase() === `@${profile.username.toLowerCase()}`) return;
      const knownHandles = new Set([
        ...registeredUsers.map(user => `@${user.username}`.toLowerCase()),
      ]);
      if (!knownHandles.has(handle.toLowerCase())) return;
      const canonicalHandle = handle.toLowerCase();
      const isFollowing = Boolean(following[canonicalHandle]);
      const nextFollowing = { ...following, [canonicalHandle]: !isFollowing };
      setFollowing(nextFollowing);
      const allFollowing = veriPressApi.getFollowingByUser();
      allFollowing[profile.username.toLowerCase()] = nextFollowing;
      const nextFollowers: FollowersMap = {};
      Object.values(allFollowing).forEach(userFollowing => Object.entries(userFollowing).forEach(([followedHandle, follows]) => {
        if (follows) nextFollowers[followedHandle.toLowerCase()] = (nextFollowers[followedHandle.toLowerCase()] ?? 0) + 1;
      }));
      setFollowers(nextFollowers);
    },
    logout: () => {
      veriPressApi.clearSession();
      setDrafts([]);
      setFollowers(veriPressApi.getFollowerCounts());
      // Reset profile to blank so the next sign-in always starts clean.
      setProfile({ name: "", username: "", avatar: null, description: "", phone: "", gender: "", dob: "" });
      setAccount(null);
      setFollowing({});
    },
  }), [account, author, avatar, defaultFollowing, drafts, followers, following, pendingAccount, profile, publishedArticles, registeredUsers, userArticles]);

  return <VeriPressContext.Provider value={value}>{children}</VeriPressContext.Provider>;
}

export function useVeriPress() {
  const context = useContext(VeriPressContext);
  if (!context) throw new Error("useVeriPress must be used inside VeriPressProvider");
  return context;
}
