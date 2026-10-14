export function safeNext(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

export function loginPrompt(nextPath: string) {
  if (nextPath.startsWith("/sell")) {
    return {
      title: "Sign in to continue your listing",
      body: "Create an account or sign in. You’ll come back to the listing after that.",
    };
  }

  return {
    title: "Log in",
    body: "Sign in with your seller account.",
  };
}
