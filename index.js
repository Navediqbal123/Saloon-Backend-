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
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
