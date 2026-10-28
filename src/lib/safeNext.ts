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

  if (nextPath.includes("/represent")) {
    return {
      title: "Agent sign in",
      body: "Only registered realtors can request representation. Buying? No account needed.",
    };
  }

  if (nextPath.includes("/choose")) {
    return {
      title: "Seller sign in",
      body: "Sign in with your seller account to choose an agent. Buying? No account needed.",
    };
  }

  return {
    title: "Log in",
    body: "Accounts are for developers and anyone managing several listings. Selling one home, or buying? You don't need an account.",
  };
}
