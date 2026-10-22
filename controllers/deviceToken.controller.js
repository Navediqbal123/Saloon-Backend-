import supabase from "../config/supabase.js";

const TOKEN_TABLE = "fcm_device_tokens";
const ACTIVE_STATUS = "active";
const ALLOWED_PLATFORMS = new Set(["android", "ios", "web"]);

function getTokenInput(req) {
  const token = req.body?.fcm_token;
  const platform = req.body?.platform;

  if (typeof token !== "string" || token.trim().length === 0) {
    return { error: "fcm_token is required" };
  }

  if (typeof platform !== "string" || !ALLOWED_PLATFORMS.has(platform)) {
    return { error: "platform must be android, ios, or web" };
  }

  return { token: token.trim(), platform };
}

async function findActiveToken(token) {
  return supabase
    .from(TOKEN_TABLE)
    .select("id, user_id")
    .eq("fcm_token", token)
    .eq("status", ACTIVE_STATUS)
    .maybeSingle();
}

async function updateOwnedActiveToken(tokenId, userId, platform) {
  return supabase
    .from(TOKEN_TABLE)
    .update({ platform })
    .eq("id", tokenId)
    .eq("user_id", userId)
    .eq("status", ACTIVE_STATUS)
    .select("id")
    .maybeSingle();
}

function registrationConflict(res) {
  return res.status(409).json({
    success: false,
    error: "This device token cannot be registered",
  });
}

function serverError(res) {
  return res.status(500).json({
    success: false,
    error: "Failed to manage device token",
  });
}

export async function registerDeviceToken(req, res) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const input = getTokenInput(req);
  if (input.error) {
    return res.status(400).json({ success: false, error: input.error });
  }

  try {
    const { data: existingToken, error: lookupError } = await findActiveToken(
      input.token
    );

    if (lookupError) {
      return serverError(res);
    }

    if (existingToken && existingToken.user_id !== userId) {
      return registrationConflict(res);
    }

    if (existingToken) {
      const { data: updatedToken, error: updateError } =
        await updateOwnedActiveToken(existingToken.id, userId, input.platform);

      if (updateError) {
        return serverError(res);
      }

      if (updatedToken) {
        return res.json({ success: true, message: "Device token registered" });
      }
    }

    const { error: insertError } = await supabase
      .from(TOKEN_TABLE)
      .insert({
        user_id: userId,
        fcm_token: input.token,
        platform: input.platform,
        status: ACTIVE_STATUS,
      });

    if (!insertError) {
      return res.status(201).json({
        success: true,
        message: "Device token registered",
      });
    }

    // A concurrent registration may have claimed this active token.
    if (insertError.code !== "23505") {
      return serverError(res);
    }

    const { data: racedToken, error: racedLookupError } = await findActiveToken(
      input.token
    );

    if (racedLookupError) {
      return serverError(res);
    }

    if (!racedToken || racedToken.user_id !== userId) {
      return registrationConflict(res);
    }

    const { data: racedUpdate, error: racedUpdateError } =
      await updateOwnedActiveToken(racedToken.id, userId, input.platform);

    if (racedUpdateError) {
      return serverError(res);
    }

    if (!racedUpdate) {
      return registrationConflict(res);
    }

    return res.json({ success: true, message: "Device token registered" });
  } catch {
    return serverError(res);
  }
}

export async function revokeDeviceToken(req, res) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const token = req.body?.fcm_token;
  if (typeof token !== "string" || token.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "fcm_token is required",
    });
  }

  try {
    const { error } = await supabase
      .from(TOKEN_TABLE)
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("fcm_token", token.trim())
      .eq("user_id", userId)
      .eq("status", ACTIVE_STATUS);

    if (error) {
      return serverError(res);
    }

    // Return the same response when the token is absent or belongs to another user.
    return res.json({ success: true, message: "Device token revoked" });
  } catch {
    return serverError(res);
  }
}
