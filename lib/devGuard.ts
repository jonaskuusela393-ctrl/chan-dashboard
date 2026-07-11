export function devWorkspaceEnabled() {
  const hosted = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (!hosted) return true;
  return process.env.ENABLE_PRODUCTION_DEV_WORKSPACE === "I_UNDERSTAND_THE_RISK";
}

export function requireDevWorkspace() {
  if (!devWorkspaceEnabled()) {
    const error = new Error("Dev Workspace is disabled on production deployments");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
}
