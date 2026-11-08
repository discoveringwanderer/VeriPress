import { supabase } from "../lib/supabase";

function throwOnSupabaseError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function isMissingAuthUserId(error: { code?: string; message: string } | null): boolean {
  return Boolean(error && (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message.includes("accounts.auth_user_id")
  ));
}

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
  archived?: boolean;
};

export type FollowingMap = Record<string, boolean>;
export type FollowersMap = Record<string, number>;
export type Account = { username: string; email: string; authUserId?: string | null };
export type UserProfile = {
  name: string;
  username: string;
  avatar: string | null;
  description: string;
  phone: string;
  gender: string;
  dob: string;
};
export type RegisteredUser = {
  username: string;
  name: string;
  avatar: string | null;
  description: string;
};
export type VeriPressBackup = {
  format: "veripress-backup";
  version: 1;
  exportedAt: string;
  username: string;
  profile: UserProfile;
  publishedArticles: StoredArticle[];
  archivedArticles: StoredArticle[];
  drafts: StoredArticle[];
  following: string[];
};

// ── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from("accounts").select("username, email, auth_user_id");
  if (isMissingAuthUserId(error)) {
    const legacy = await supabase.from("accounts").select("username, email");
    throwOnSupabaseError(legacy.error);
    return (legacy.data ?? []).map((row) => ({ username: row.username, email: row.email }));
  }
  throwOnSupabaseError(error);
  return (data ?? []).map((row) => ({
    username: row.username,
    email: row.email,
    authUserId: row.auth_user_id,
  }));
}

export async function saveAccount(account: Account): Promise<void> {
  const { error } = await supabase.from("accounts").upsert(
    {
      username: account.username,
      email: account.email,
      auth_user_id: account.authUserId ?? null,
    },
    { onConflict: "username" }
  );
  if (isMissingAuthUserId(error)) {
    const legacy = await supabase.from("accounts").upsert(
      {
        username: account.username,
        email: account.email,
        password: crypto.randomUUID(),
      },
      { onConflict: "username" }
    );
    throwOnSupabaseError(legacy.error);
    return;
  }
  throwOnSupabaseError(error);
}

export async function getAccountByIdentifier(identifier: string): Promise<Account | null> {
  const lower = identifier.trim().toLowerCase();
  const { data: usernameData, error: usernameError } = await supabase
    .from("accounts")
    .select("username, email, auth_user_id")
    .ilike("username", lower)
    .limit(1);
  if (isMissingAuthUserId(usernameError)) {
    const { data: legacyUsernameData, error: legacyUsernameError } = await supabase
      .from("accounts")
      .select("username, email")
      .ilike("username", lower)
      .limit(1);
    throwOnSupabaseError(legacyUsernameError);
    const { data: legacyEmailData, error: legacyEmailError } = legacyUsernameData?.length
      ? { data: null, error: null }
      : await supabase.from("accounts").select("username, email").ilike("email", lower).limit(1);
    throwOnSupabaseError(legacyEmailError);
    const row = legacyUsernameData?.[0] ?? legacyEmailData?.[0];
    return row ? { username: row.username, email: row.email } : null;
  }
  throwOnSupabaseError(usernameError);
  const row = usernameData?.[0];
  if (row) return { username: row.username, email: row.email, authUserId: row.auth_user_id };

  const { data: emailData, error: emailError } = await supabase
    .from("accounts")
    .select("username, email, auth_user_id")
    .ilike("email", lower)
    .limit(1);
  throwOnSupabaseError(emailError);
  const emailRow = emailData?.[0];
  return emailRow
    ? { username: emailRow.username, email: emailRow.email, authUserId: emailRow.auth_user_id }
    : null;
}

export async function getAccountByAuthUserId(authUserId: string): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("username, email, auth_user_id")
    .eq("auth_user_id", authUserId)
    .limit(1);
  if (isMissingAuthUserId(error)) return null;
  throwOnSupabaseError(error);
  const row = data?.[0];
  return row ? { username: row.username, email: row.email, authUserId: row.auth_user_id } : null;
}

export async function renameAccountUsername(
  previousUsername: string,
  nextUsername: string
): Promise<boolean> {
  const prev = previousUsername.trim().toLowerCase();
  const next = nextUsername.trim();
  if (!prev || !next.toLowerCase() || prev === next.toLowerCase()) return true;

  const { data: existing, error: existingError } = await supabase
    .from("accounts")
    .select("username")
    .ilike("username", next)
    .neq("username", previousUsername)
    .limit(1);
  throwOnSupabaseError(existingError);
  if (existing && existing.length > 0) return false;

  const { error } = await supabase.from("accounts").update({ username: next }).ilike("username", previousUsername);
  throwOnSupabaseError(error);
  return true;
}

// ── Profiles ────────────────────────────────────────────────────────────────

export async function getProfileForUser(username: string): Promise<UserProfile | null> {
  if (!username) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .limit(1);
  throwOnSupabaseError(error);
  if (!data || data.length === 0) return null;
  const row = data[0];
  return {
    username: row.username,
    name: row.name ?? "",
    avatar: row.avatar ?? null,
    description: row.description ?? "",
    phone: row.phone ?? "",
    gender: row.gender ?? "",
    dob: row.dob ?? "",
  };
}

export async function saveProfileForUser(username: string, profile: UserProfile): Promise<void> {
  if (!username) return;
  const { error } = await supabase.from("profiles").upsert(
    {
      username,
      name: profile.name,
      avatar: profile.avatar,
      description: profile.description,
      phone: profile.phone,
      gender: profile.gender,
      dob: profile.dob,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "username" }
  );
  throwOnSupabaseError(error);
}

// ── Articles ────────────────────────────────────────────────────────────────

export async function getUserArticles(): Promise<StoredArticle[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });
  throwOnSupabaseError(error);
  return (data ?? []).map(dbToArticle).filter((article) => !article.archived);
}

export async function getArchivedArticles(username: string): Promise<StoredArticle[]> {
  if (!username) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .ilike("owner_username", username)
    .eq("archived", true)
    .order("created_at", { ascending: false });
  throwOnSupabaseError(error);
  return (data ?? []).map(dbToArticle);
}

export async function setArticleArchived(id: string, username: string, archived: boolean): Promise<void> {
  const { data, error } = await supabase
    .from("articles")
    .update({ archived })
    .eq("id", id)
    .ilike("owner_username", username)
    .select("id");
  if (error && (error.code === "42703" || error.code === "PGRST204" || error.message.includes("archived"))) {
    throw new Error("Run the article archiving migration in Supabase before archiving articles.");
  }
  throwOnSupabaseError(error);
  if (!data?.length) throw new Error("Article not found or you do not have permission to change it.");
}

export async function saveArticle(article: StoredArticle): Promise<void> {
  const { error } = await supabase.from("articles").upsert(articleToDb(article), { onConflict: "id" });
  throwOnSupabaseError(error);
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase.from("articles").delete().eq("id", id);
  throwOnSupabaseError(error);
}

export function subscribeToSocialUpdates(onChange: () => void): () => void {
  const channel = supabase
    .channel("veripress-social-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "following" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// ── Drafts ──────────────────────────────────────────────────────────────────

export async function getDrafts(ownerUsername: string): Promise<StoredArticle[]> {
  if (!ownerUsername) return [];
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .ilike("owner_username", ownerUsername)
    .order("created_at", { ascending: false });
  throwOnSupabaseError(error);
  return (data ?? []).map(dbToArticle);
}

export async function saveDraft(article: StoredArticle): Promise<void> {
  const { error } = await supabase.from("drafts").upsert(articleToDb(article), { onConflict: "id" });
  throwOnSupabaseError(error);
}

export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase.from("drafts").delete().eq("id", id);
  throwOnSupabaseError(error);
}

// ── Following ────────────────────────────────────────────────────────────────

export async function getFollowingForUser(username: string): Promise<FollowingMap> {
  if (!username) return {};
  const { data, error } = await supabase
    .from("following")
    .select("following_username")
    .ilike("follower_username", username);
  throwOnSupabaseError(error);
  const map: FollowingMap = {};
  (data ?? []).forEach((row) => {
    map[`@${row.following_username}`.toLowerCase()] = true;
  });
  return map;
}

export async function createUserBackup(username: string): Promise<VeriPressBackup> {
  const [profile, articles, archivedArticles, drafts, following] = await Promise.all([
    getProfileForUser(username),
    getUserArticles(),
    getArchivedArticles(username),
    getDrafts(username),
    getFollowingForUser(username),
  ]);
  if (!profile) throw new Error("Your profile could not be found, so a backup cannot be created.");
  return {
    format: "veripress-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    username,
    profile,
    publishedArticles: articles.filter(
      (article) => article.ownerUsername?.toLowerCase() === username.toLowerCase()
    ),
    archivedArticles,
    drafts,
    following: Object.keys(following).filter((handle) => following[handle]),
  };
}

export async function restoreUserBackup(username: string, backup: VeriPressBackup): Promise<void> {
  if (backup.format !== "veripress-backup" || backup.version !== 1) {
    throw new Error("This backup format is not supported.");
  }
  if (backup.username.toLowerCase() !== username.toLowerCase()) {
    throw new Error("This backup belongs to a different username.");
  }
  if (backup.profile.username.toLowerCase() !== username.toLowerCase()) {
    throw new Error("The backup profile does not match the signed-in user.");
  }

  await saveProfileForUser(username, { ...backup.profile, username });

  async function restoreArticle(article: StoredArticle, archived: boolean, draft: boolean): Promise<void> {
    if (article.ownerUsername && article.ownerUsername.toLowerCase() !== username.toLowerCase()) {
      throw new Error("The backup contains an article belonging to another user.");
    }
    let id = article.id;
    const table = draft ? "drafts" : "articles";
    const { data: existing, error } = await supabase.from(table).select("owner_username").eq("id", id).limit(1);
    throwOnSupabaseError(error);
    if (existing?.[0] && existing[0].owner_username?.toLowerCase() !== username.toLowerCase()) {
      id = `restored-${crypto.randomUUID()}`;
    }
    const restoredArticle = {
      ...article,
      id,
      ownerUsername: username,
      archived: draft ? false : archived,
    };
    if (draft) await saveDraft(restoredArticle);
    else await saveArticle(restoredArticle);
  }

  for (const article of backup.publishedArticles) await restoreArticle(article, false, false);
  for (const article of backup.archivedArticles) await restoreArticle(article, true, false);
  for (const article of backup.drafts) await restoreArticle(article, false, true);
  for (const handle of backup.following) {
    const target = handle.replace(/^@/, "").trim();
    if (target && target.toLowerCase() !== username.toLowerCase()) {
      await followUser(username, target);
    }
  }
}

export async function getFollowingByUser(): Promise<Record<string, FollowingMap>> {
  const { data, error } = await supabase.from("following").select("follower_username, following_username");
  throwOnSupabaseError(error);
  const result: Record<string, FollowingMap> = {};
  (data ?? []).forEach((row) => {
    const follower = row.follower_username.toLowerCase();
    const following = `@${row.following_username}`.toLowerCase();
    if (!result[follower]) result[follower] = {};
    result[follower][following] = true;
  });
  return result;
}

export async function followUser(followerUsername: string, followingUsername: string): Promise<void> {
  const follower = followerUsername.trim();
  const following = followingUsername.replace(/^@/, "").trim();
  // Resolve exact-case usernames from accounts to satisfy the foreign key
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("username")
    .or(`username.ilike.${follower},username.ilike.${following}`);
  throwOnSupabaseError(accountsError);
  const exactFollower = accounts?.find(a => a.username.toLowerCase() === follower.toLowerCase())?.username ?? follower;
  const exactFollowing = accounts?.find(a => a.username.toLowerCase() === following.toLowerCase())?.username ?? following;
  const { error } = await supabase.from("following").upsert(
    { follower_username: exactFollower, following_username: exactFollowing },
    { onConflict: "follower_username,following_username" }
  );
  throwOnSupabaseError(error);
}

export async function unfollowUser(followerUsername: string, followingUsername: string): Promise<void> {
  const follower = followerUsername.trim();
  const following = followingUsername.replace(/^@/, "").trim();
  const { error } = await supabase
    .from("following")
    .delete()
    .ilike("follower_username", follower)
    .ilike("following_username", following);
  throwOnSupabaseError(error);
}

export async function getFollowerCounts(): Promise<FollowersMap> {
  const { data, error } = await supabase.from("following").select("following_username");
  throwOnSupabaseError(error);
  const counts: FollowersMap = {};
  (data ?? []).forEach((row) => {
    const handle = `@${row.following_username}`.toLowerCase();
    counts[handle] = (counts[handle] ?? 0) + 1;
  });
  return counts;
}

// ── Registered Users ─────────────────────────────────────────────────────────

export async function getRegisteredUsers(): Promise<RegisteredUser[]> {
  // Merge accounts + profiles so every registered user appears,
  // even those who haven't completed their profile yet.
  const [profilesRes, accountsRes] = await Promise.all([
    supabase.from("profiles").select("username, name, avatar, description"),
    supabase.from("accounts").select("username"),
  ]);
  throwOnSupabaseError(profilesRes.error);
  throwOnSupabaseError(accountsRes.error);

  const profileMap = new Map<string, RegisteredUser>();
  (profilesRes.data ?? []).forEach((row) => {
    profileMap.set(row.username.toLowerCase(), {
      username: row.username,
      name: row.name ?? "",
      avatar: row.avatar ?? null,
      description: row.description ?? "",
    });
  });

  // Add any account that doesn't yet have a profile row
  (accountsRes.data ?? []).forEach((row) => {
    if (!profileMap.has(row.username.toLowerCase())) {
      profileMap.set(row.username.toLowerCase(), {
        username: row.username,
        name: "",
        avatar: null,
        description: "",
      });
    }
  });

  return Array.from(profileMap.values());
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dbToArticle(row: Record<string, unknown>): StoredArticle {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    image: (row.image as string) ?? "",
    category: (row.category as string) ?? "My Story",
    author: row.author as string,
    avatar: (row.avatar as string) ?? "",
    time: row.created_at
      ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
          new Date(row.created_at as string)
        )
      : "",
    ownerUsername: row.owner_username as string,
    archived: row.archived === true,
  };
}

function articleToDb(article: StoredArticle): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: article.id,
    title: article.title,
    body: article.body,
    image: article.image ?? "",
    category: article.category ?? "My Story",
    author: article.author,
    avatar: article.avatar ?? "",
    owner_username: article.ownerUsername ?? "",
  };
  if (article.archived !== undefined) row.archived = article.archived;
  return row;
}

// ── Remembered email (kept in localStorage — not sensitive) ──────────────────

const REMEMBERED_EMAIL_KEY = "veripress.remembered-email";

export function getRememberedEmail(): string {
  try { return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ""; } catch { return ""; }
}

export function saveRememberedEmail(email: string): void {
  try {
    if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch { /* optional */ }
}

// Keep a legacy veriPressApi object so existing call sites that haven't been
// updated yet don't throw at import time.
export const veriPressApi = {
  getRememberedEmail,
  saveRememberedEmail,
  nukeAllData() {
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("veripress.")) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch { /* storage unavailable */ }
  },
};
