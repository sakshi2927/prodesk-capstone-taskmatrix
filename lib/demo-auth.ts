export type DemoUser = {
  uid: string;
  email: string;
  name: string;
};

const DEMO_SESSION_KEY = "taskmatrix-demo-session";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function isFetchFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Failed to fetch|fetch failed|network error|networkrequestfailed|TypeError/i.test(error.message)
  );
}

export function createDemoUser(email: string, name?: string): DemoUser {
  const normalizedEmail = email.trim().toLowerCase();
  const derivedName = name?.trim() || normalizedEmail.split("@")[0] || "Anonymous";

  return {
    uid: `demo-${toSlug(normalizedEmail) || "user"}`,
    email: normalizedEmail,
    name: derivedName,
  };
}

export function readDemoSession(): DemoUser | null {
  if (!isBrowser()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(DEMO_SESSION_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as Partial<DemoUser>;
    if (!parsed.uid || !parsed.email || !parsed.name) {
      return null;
    }

    return {
      uid: parsed.uid,
      email: parsed.email,
      name: parsed.name,
    };
  } catch {
    return null;
  }
}

export function saveDemoSession(user: DemoUser): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
  document.cookie = `auth-token=demo-${user.uid}; path=/; max-age=604800; samesite=lax`;
}

export function clearDemoSession(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(DEMO_SESSION_KEY);
  document.cookie = "auth-token=; path=/; max-age=0; samesite=lax";
}