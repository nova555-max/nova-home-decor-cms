export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  try {
    const { logEnvDiagnostics } = await import("@/lib/env/runtime");
    logEnvDiagnostics("[startup]");
  } catch (error) {
    console.error(
      "[startup] Environment validation failed:",
      error instanceof Error ? error.message : error,
    );
  }
}
