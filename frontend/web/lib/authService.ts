import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  try {
    
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "signup",
        email,
        password,
        firstName,
        lastName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Signup failed");
    }

    return {
      userId: data.userId,
      payId: data.payId,
      publicKey: data.publicKey,
      email,
    };
  } catch (error) {
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login",
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    
    localStorage.setItem("session", JSON.stringify(data.user));

    return data.user;
  } catch (error) {
    throw error;
  }
}

export async function signOut() {
  localStorage.removeItem("session");
  await supabase.auth.signOut();
}

export function getSession() {
  const session = localStorage.getItem("session");
  return session ? JSON.parse(session) : null;
}

export async function updateProfile(
  firstName: string,
  lastName: string,
  avatarUrl?: string
) {
  try {
    const session = getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": session.id,
      },
      body: JSON.stringify({
        firstName,
        lastName,
        avatarUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Update failed");
    }

    
    const updatedSession = { ...session, firstName, lastName };
    localStorage.setItem("session", JSON.stringify(updatedSession));

    return updatedSession;
  } catch (error) {
    throw error;
  }
}

export async function verifyPassword(
  email: string,
  password: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return !error;
  } catch {
    return false;
  }
}
