import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import barberRoutes from "./routes/barber.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import clientRoutes from "./routes/client.routes.js";
import likedShopRoutes from "./routes/likedShopRoutes.js";
import deviceTokenRoutes from "./routes/deviceToken.routes.js";

dotenv.config();

const app = express();

// =========================
// CORS
// =========================
const allowedOrigins = [
  "https://trimly-prime-booking.lovable.app",
  "https://www.trimlyhub.com",
  "https://trimlyhub.com",
  "https://id-preview--27262027-4cab-47a6-a934-e97feae3b270.lovable.app",
  // Capacitor defaults: https://localhost on Android and capacitor://localhost on iOS.
  "https://localhost",
  "capacitor://localhost",
  // Keep this exact local origin for Android builds configured with androidScheme: "http".
  "http://localhost",
  "http://localhost:8080",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header (for example native clients) do not need CORS headers.
      if (!origin) {
        return callback(null, false);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Do not turn a disallowed browser origin into an Express 500.
      // The browser still blocks access because no Access-Control-Allow-Origin is emitted.
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle OPTIONS before JSON parsing, authentication, and route middleware.
// Allowed origins are answered by the CORS middleware above; this fallback
// keeps other preflight requests from falling through to protected routes.
app.options("*", (_req, res) => res.sendStatus(204));

app.use(express.json());

// =========================
// ROUTES
// =========================
app.use("/api/auth", authRoutes);
app.use("/api/barber", barberRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/liked-shops", likedShopRoutes);
app.use("/api/device-tokens", deviceTokenRoutes);

// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// =========================
// PORT
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
