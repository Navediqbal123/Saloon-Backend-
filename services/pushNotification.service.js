import supabase from "../config/supabase.js";
import { getFirebaseMessaging } from "../config/firebase-admin.js";

const TOKEN_TABLE = "fcm_device_tokens";
const ACTIVE_STATUS = "active";
const MAX_TOKENS_PER_SEND = 500;
const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function logPushFailure(message, error) {
  // Log only an error code; never log the token or message payload.
  console.error(message, error?.code || "unknown");
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeData(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)])
  );
}

async function revokeInvalidToken(userId, tokenRecordId) {
  const { error } = await supabase
    .from(TOKEN_TABLE)
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", tokenRecordId)
    .eq("user_id", userId)
    .eq("status", ACTIVE_STATUS);

  if (error) {
    logPushFailure("Failed to revoke invalid FCM token:", error);
  }
}

/** Send one event to active device tokens belonging only to the listed users. */
export async function sendPushToUsers({ userIds, title, body, data = {} }) {
  const recipients = [...new Set(userIds.filter(Boolean))];
  if (recipients.length === 0) return;

  try {
    const { data: tokenRecords, error: tokenQueryError } = await supabase
      .from(TOKEN_TABLE)
      .select("id, user_id, fcm_token")
      .in("user_id", recipients)
      .eq("status", ACTIVE_STATUS);

    if (tokenQueryError) {
      logPushFailure("Failed to look up active FCM tokens:", tokenQueryError);
      return;
    }

    if (!tokenRecords?.length) return;

    const messaging = getFirebaseMessaging();
    const messageData = normalizeData(data);

    for (const tokenBatch of chunk(tokenRecords, MAX_TOKENS_PER_SEND)) {
      try {
        const batchResponse = await messaging.sendEachForMulticast({
          tokens: tokenBatch.map((record) => record.fcm_token),
          notification: { title, body },
          data: messageData,
        });

        const invalidTokenRevocations = [];

        batchResponse.responses.forEach((response, index) => {
          const code = response.error?.code;
          if (code && INVALID_TOKEN_ERROR_CODES.has(code)) {
            const record = tokenBatch[index];
            invalidTokenRevocations.push(
              revokeInvalidToken(record.user_id, record.id)
            );
          } else if (!response.success) {
            logPushFailure("FCM delivery failed:", response.error);
          }
        });

        await Promise.all(invalidTokenRevocations);
      } catch (error) {
        // A failed push must not affect the already-created in-app notification.
        logPushFailure("FCM batch delivery failed:", error);
      }
    }
  } catch (error) {
    // Includes lazy Firebase Admin initialization failures.
    logPushFailure("FCM notification processing failed:", error);
  }
}

export function sendPushToUser(options) {
  return sendPushToUsers({ ...options, userIds: [options.userId] });
}
