import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let messaging;

/**
 * Lazily initialize Firebase Admin when a server-side notification needs it.
 * Application Default Credentials support backend service identities and the
 * GOOGLE_APPLICATION_CREDENTIALS path without embedding credential values.
 */
export function getFirebaseMessaging() {
  if (messaging) {
    return messaging;
  }

  const app =
    getApps().find((registeredApp) => registeredApp.name === "[DEFAULT]") ??
    initializeApp({ credential: applicationDefault() });

  messaging = getMessaging(app);
  return messaging;
}
