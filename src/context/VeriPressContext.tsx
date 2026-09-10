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
  const defaultAvatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format";
  const [publishedArticles, setPublishedArticles] = useState<StoredArticle[]>(() => veriPressApi.getUserArticles());
  const [drafts, setDrafts] = useState<StoredArticle[]>(() => veriPressApi.getDrafts());
  const [account, setAccount] = useState<Account | null>(() => veriPressApi.getAccount());
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<UserProfile>(() => veriPressApi.getProfile());
  const [following, setFollowing] = useState<FollowingMap>(() => getRegisteredFollowing(defaultFollowing, veriPressApi.getProfile().username || "guest"));
  const [followers, setFollowers] = useState<FollowersMap>(() => veriPressApi.getFollowerCounts());
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => veriPressApi.getRegisteredUsers());

  const author = profile.name.trim() || profile.username.trim() || "Your Profile";
  const avatar = profile.avatar ?? defaultAvatar;
  const userArticles = publishedArticles.filter(item => item.ownerUsername ? item.ownerUsername.toLowerCase() === profile.username.toLowerCase() : item.author === author);
  const registeredHandles = new Set(registeredUsers.map(user => `@${user.username}`.toLowerCase()));
  const allFollowing = Object.fromEntries(Object.entries(veriPressApi.getFollowingByUser()).filter(([username]) => profile.username ? username !== "guest" : true).map(([username, userFollowing]) => [
    username.toLowerCase(),
    Object.fromEntries(Object.entries(userFollowing).filter(([handle, isFollowing]) => registeredHandles.has(handle.toLowerCase()) && isFollowing).map(([handle, isFollowing]) => [handle.toLowerCase(), isFollowing])),
  ]));
  allFollowing[profile.username.toLowerCase()] = following;
  const actualFollowers: FollowersMap = {};
  Object.values(allFollowing).forEach(userFollowing => Object.entries(userFollowing).forEach(([handle, isFollowing]) => {
    if (isFollowing) actualFollowers[handle.toLowerCase()] = (actualFollowers[handle.toLowerCase()] ?? 0) + 1;
  }));
  const followingCounts = Object.fromEntries(Object.entries(allFollowing).map(([username, userFollowing]) => [username, Object.values(userFollowing).filter(Boolean).length]));
  const followerHandles = Object.entries(allFollowing)
    .filter(([, userFollowing]) => Boolean(userFollowing[`@${profile.username}`.toLowerCase()]))
    .map(([username]) => `@${username}`);
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
  useEffect(() => veriPressApi.saveProfile(profile), [profile]);
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
        veriPressApi.saveAccounts([...veriPressApi.getAccounts(), pendingAccount]);
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
        const updated = current.filter(user => user.username.toLowerCase() !== previousUsername.toLowerCase());
        return [...updated, { username: next.username, name: next.name, avatar: next.avatar, description: next.description }];
      });
      setPublishedArticles(current => current.map(item => item.ownerUsername?.toLowerCase() === profile.username.toLowerCase() || (!item.ownerUsername && item.author === author) ? { ...item, author: nextAuthor, avatar: nextAvatar, ownerUsername: next.username } : item));
      setDrafts(current => current.map(item => ({ ...item, author: nextAuthor, avatar: nextAvatar })));
    },
    createAccount: (nextAccount: Account) => {
      const existingAccounts = veriPressApi.getAccounts();
      if (existingAccounts.some(existing => existing.username.toLowerCase() === nextAccount.username.toLowerCase())) return "username-exists" as const;
      if (existingAccounts.some(existing => existing.email.toLowerCase() === nextAccount.email.toLowerCase())) return "email-exists" as const;
      setPendingAccount(nextAccount);
      return "created" as const;
    },
    signIn: (identifier: string, password: string) => {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      const matchedAccount = veriPressApi.getAccounts().find(stored => (stored.email.toLowerCase() === normalizedIdentifier || stored.username.toLowerCase() === normalizedIdentifier) && stored.password === password);
      if (!matchedAccount) return false;

      const matchedUser = registeredUsers.find(user => user.username.toLowerCase() === matchedAccount.username.toLowerCase());
      const emptyProfile: UserProfile = { name: "", username: matchedAccount.username, avatar: null, description: "", phone: "", gender: "", dob: "" };
      veriPressApi.saveAccount(matchedAccount);
      setAccount(matchedAccount);
      setFollowing(getRegisteredFollowing(defaultFollowing, matchedAccount.username));
      setFollowers(veriPressApi.getFollowerCounts());
      setProfile(matchedUser ? current => ({ ...current, username: matchedUser.username, name: matchedUser.name, avatar: matchedUser.avatar, description: matchedUser.description }) : emptyProfile);
      if (matchedUser?.name) {
        setDrafts(current => current.filter(draft => draft.author === matchedUser.name));
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
    },
  }), [account, author, avatar, defaultFollowing, drafts, followers, following, pendingAccount, profile, publishedArticles, registeredUsers, userArticles]);

  return <VeriPressContext.Provider value={value}>{children}</VeriPressContext.Provider>;
}

export function useVeriPress() {
  const context = useContext(VeriPressContext);
  if (!context) throw new Error("useVeriPress must be used inside VeriPressProvider");
  return context;
}
