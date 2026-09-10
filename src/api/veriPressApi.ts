export type StoredArticle = {
  id: string;
  title: string;
  author: string;
  avatar: string;
  time: string;
  image: string;
  body: string;
  category: string;
  ownerUsername?: string;
};

export type FollowingMap = Record<string, boolean>;
export type FollowersMap = Record<string, number>;
export type Account = { username: string; email: string; password: string };
export type UserProfile = { name: string; username: string; avatar: string | null; description: string; phone: string; gender: string; dob: string };
export type RegisteredUser = { username: string; name: string; avatar: string | null; description: string };

const ARTICLES_KEY = "veripress.user-articles";
const DRAFTS_KEY = "veripress.user-drafts";
const FOLLOWING_KEY = "veripress.following";
const FOLLOWING_BY_USER_KEY = "veripress.following-by-user";
const FOLLOWERS_KEY = "veripress.followers";
const ACCOUNT_KEY = "veripress.account";
const ACCOUNTS_KEY = "veripress.accounts";
const PROFILE_KEY = "veripress.profile";
const REGISTERED_USERS_KEY = "veripress.registered-users";
const REMEMBERED_EMAIL_KEY = "veripress.remembered-email";

export const veriPressApi = {
  getUserArticles(): StoredArticle[] {
    return readStorage<StoredArticle[]>(ARTICLES_KEY, []);
  },

  saveUserArticles(articles: StoredArticle[]) {
    writeStorage(ARTICLES_KEY, articles);
  },

  getDrafts(): StoredArticle[] {
    return readStorage<StoredArticle[]>(DRAFTS_KEY, []);
  },

  saveDrafts(drafts: StoredArticle[]) {
    writeStorage(DRAFTS_KEY, drafts);
  },

  getFollowing(defaultValue: FollowingMap, username = "guest"): FollowingMap {
    const allFollowing = readStorage<Record<string, FollowingMap> | null>(FOLLOWING_BY_USER_KEY, null);
    if (allFollowing) return allFollowing[username.toLowerCase()] ?? defaultValue;
    return readStorage<FollowingMap>(FOLLOWING_KEY, defaultValue);
  },

  saveFollowing(following: FollowingMap, username = "guest") {
    writeStorage(FOLLOWING_KEY, following);
    const allFollowing = this.getFollowingByUser();
    if (username.toLowerCase() !== "guest") delete allFollowing.guest;
    allFollowing[username.toLowerCase()] = following;
    writeStorage(FOLLOWING_BY_USER_KEY, allFollowing);
  },

  getFollowingByUser(): Record<string, FollowingMap> {
    const stored = readStorage<Record<string, FollowingMap> | null>(FOLLOWING_BY_USER_KEY, null);
    const registeredHandles = new Set(this.getRegisteredUsers().map(user => `@${user.username}`.toLowerCase()));
    const source = stored ?? { guest: readStorage<FollowingMap>(FOLLOWING_KEY, {}) };
    return Object.fromEntries(Object.entries(source).map(([username, following]) => [
      username.toLowerCase(),
      Object.fromEntries(Object.entries(following).filter(([handle, isFollowing]) => registeredHandles.has(handle.toLowerCase()) && isFollowing).map(([handle, isFollowing]) => [handle.toLowerCase(), isFollowing])),
    ]));
  },

  getFollowerCounts(): FollowersMap {
    const counts: FollowersMap = {};
    Object.values(this.getFollowingByUser()).forEach(following => {
      Object.entries(following).forEach(([handle, isFollowing]) => {
        if (isFollowing) counts[handle] = (counts[handle] ?? 0) + 1;
      });
    });
    return counts;
  },

  getFollowers(defaultValue: FollowersMap): FollowersMap {
    return readStorage<FollowersMap>(FOLLOWERS_KEY, defaultValue);
  },

  saveFollowers(followers: FollowersMap) {
    writeStorage(FOLLOWERS_KEY, followers);
  },

  getAccount(): Account | null {
    const activeAccount = readStorage<Account | null>(ACCOUNT_KEY, null);
    return activeAccount ?? this.getAccounts()[0] ?? null;
  },

  saveAccount(account: Account) {
    writeStorage(ACCOUNT_KEY, account);
  },

  getAccounts(): Account[] {
    const accounts = readStorage<Account[] | null>(ACCOUNTS_KEY, null);
    if (accounts) return accounts;
    const legacyAccount = readStorage<Account | null>(ACCOUNT_KEY, null);
    return legacyAccount ? [legacyAccount] : [];
  },

  saveAccounts(accounts: Account[]) {
    writeStorage(ACCOUNTS_KEY, accounts);
  },

  renameAccountUsername(previousUsername: string, nextUsername: string): boolean {
    const previousKey = previousUsername.trim().toLowerCase();
    const nextValue = nextUsername.trim();
    const nextKey = nextValue.toLowerCase();
    if (!previousKey || !nextKey || previousKey === nextKey) return true;

    const accounts = this.getAccounts();
    if (accounts.some(account => account.username.toLowerCase() === nextKey && account.username.toLowerCase() !== previousKey)) return false;
    this.saveAccounts(accounts.map(account => account.username.toLowerCase() === previousKey ? { ...account, username: nextValue } : account));

    const followingByUser = this.getFollowingByUser();
    const migratedFollowing: Record<string, FollowingMap> = {};
    Object.entries(followingByUser).forEach(([username, following]) => {
      const ownerKey = username === previousKey ? nextKey : username;
      migratedFollowing[ownerKey] = Object.fromEntries(Object.entries(following).map(([handle, isFollowing]) => [
        handle.toLowerCase() === `@${previousKey}` ? `@${nextKey}` : handle,
        isFollowing,
      ]));
    });
    writeStorage(FOLLOWING_BY_USER_KEY, migratedFollowing);
    return true;
  },

  getRegisteredUsers(): RegisteredUser[] {
    return readStorage<RegisteredUser[]>(REGISTERED_USERS_KEY, []);
  },

  saveRegisteredUsers(users: RegisteredUser[]) {
    writeStorage(REGISTERED_USERS_KEY, users);
  },

  getRememberedEmail(): string {
    try {
      return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  },

  saveRememberedEmail(email: string) {
    try {
      if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Remembered email is optional when storage is unavailable.
    }
  },

  getProfile(): UserProfile {
    const fallback: UserProfile = { name: "", username: "", avatar: null, description: "", phone: "", gender: "", dob: "" };
    return { ...fallback, ...readStorage<Partial<UserProfile>>(PROFILE_KEY, {}) };
  },

  saveProfile(profile: UserProfile) {
    writeStorage(PROFILE_KEY, profile);
  },

  clearSession() {
    window.localStorage.removeItem(DRAFTS_KEY);
  },
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app still works for the current session if storage is unavailable.
  }
}
