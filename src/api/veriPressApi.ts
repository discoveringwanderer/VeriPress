import { supabase } from "../lib/supabase";

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

// ── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const { data } = await supabase.from("accounts").select("username, email, password");
  return (data ?? []) as Account[];
}

export async function saveAccount(account: Account): Promise<void> {
  await supabase.from("accounts").upsert(
    { username: account.username, email: account.email, password: account.password },
    { onConflict: "username" }
  );
}

export async function getAccountByIdentifier(identifier: string): Promise<Account | null> {
  const lower = identifier.trim().toLowerCase();
  const { data, error } = await supabase
    .from("accounts")
    .select("username, email, password")
    .or(`email.ilike.${lower},username.ilike.${lower}`)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0] as Account;
}

export async function renameAccountUsername(
  previousUsername: string,
  nextUsername: string
): Promise<boolean> {
  const prev = previousUsername.trim().toLowerCase();
  const next = nextUsername.trim();
  if (!prev || !next.toLowerCase() || prev === next.toLowerCase()) return true;

  const { data: existing } = await supabase
    .from("accounts")
    .select("username")
    .ilike("username", next)
    .neq("username", previousUsername)
    .limit(1);
  if (existing && existing.length > 0) return false;

  await supabase.from("accounts").update({ username: next }).ilike("username", previousUsername);
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
  if (error || !data || data.length === 0) return null;
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
  await supabase.from("profiles").upsert(
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
}

// ── Articles ────────────────────────────────────────────────────────────────

export async function getUserArticles(): Promise<StoredArticle[]> {
  const { data } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(dbToArticle);
}

export async function saveArticle(article: StoredArticle): Promise<void> {
  await supabase.from("articles").upsert(articleToDb(article), { onConflict: "id" });
}

export async function deleteArticle(id: string): Promise<void> {
  await supabase.from("articles").delete().eq("id", id);
}

// ── Drafts ──────────────────────────────────────────────────────────────────

export async function getDrafts(ownerUsername: string): Promise<StoredArticle[]> {
  if (!ownerUsername) return [];
  const { data } = await supabase
    .from("drafts")
    .select("*")
    .ilike("owner_username", ownerUsername)
    .order("created_at", { ascending: false });
  return (data ?? []).map(dbToArticle);
}

export async function saveDraft(article: StoredArticle): Promise<void> {
  await supabase.from("drafts").upsert(articleToDb(article), { onConflict: "id" });
}

export async function deleteDraft(id: string): Promise<void> {
  await supabase.from("drafts").delete().eq("id", id);
}

// ── Following ────────────────────────────────────────────────────────────────

export async function getFollowingForUser(username: string): Promise<FollowingMap> {
  if (!username) return {};
  const { data } = await supabase
    .from("following")
    .select("following_username")
    .ilike("follower_username", username);
  const map: FollowingMap = {};
  (data ?? []).forEach((row) => {
    map[`@${row.following_username}`.toLowerCase()] = true;
  });
  return map;
}

export async function getFollowingByUser(): Promise<Record<string, FollowingMap>> {
  const { data } = await supabase.from("following").select("follower_username, following_username");
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
  const { data: accounts } = await supabase
    .from("accounts")
    .select("username")
    .or(`username.ilike.${follower},username.ilike.${following}`);
  const exactFollower = accounts?.find(a => a.username.toLowerCase() === follower.toLowerCase())?.username ?? follower;
  const exactFollowing = accounts?.find(a => a.username.toLowerCase() === following.toLowerCase())?.username ?? following;
  await supabase.from("following").upsert(
    { follower_username: exactFollower, following_username: exactFollowing },
    { onConflict: "follower_username,following_username" }
  );
}

export async function unfollowUser(followerUsername: string, followingUsername: string): Promise<void> {
  const follower = followerUsername.trim();
  const following = followingUsername.replace(/^@/, "").trim();
  await supabase
    .from("following")
    .delete()
    .ilike("follower_username", follower)
    .ilike("following_username", following);
}

export async function getFollowerCounts(): Promise<FollowersMap> {
  const { data } = await supabase.from("following").select("following_username");
  const counts: FollowersMap = {};
  (data ?? []).forEach((row) => {
    const handle = `@${row.following_username}`.toLowerCase();
    counts[handle] = (counts[handle] ?? 0) + 1;
  });
  return counts;
}

// ── Registered Users ─────────────────────────────────────────────────────────

export async function getRegisteredUsers(): Promise<RegisteredUser[]> {
  const { data } = await supabase
    .from("profiles")
    .select("username, name, avatar, description");
  return (data ?? []).map((row) => ({
    username: row.username,
    name: row.name ?? "",
    avatar: row.avatar ?? null,
    description: row.description ?? "",
  }));
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
  };
}

function articleToDb(article: StoredArticle): Record<string, unknown> {
  return {
    id: article.id,
    title: article.title,
    body: article.body,
    image: article.image ?? "",
    category: article.category ?? "My Story",
    author: article.author,
    avatar: article.avatar ?? "",
    owner_username: article.ownerUsername ?? "",
  };
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
