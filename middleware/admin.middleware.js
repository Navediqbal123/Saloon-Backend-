export function createAdminMiddleware(
  configuredAdminEmails = process.env.ADMIN_EMAILS ?? ""
) {
  const adminEmails = new Set(
    String(configuredAdminEmails)
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  return async function adminMiddleware(req, res, next) {
    if (typeof req.user?.id !== "string" || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const authenticatedEmail = typeof req.user.email === "string"
      ? req.user.email.trim().toLowerCase()
      : "";
    if (authenticatedEmail && adminEmails.has(authenticatedEmail)) {
      return next();
    }

    return res.status(403).json({ error: "Admin access required" });
  };
}

export const adminMiddleware = createAdminMiddleware();