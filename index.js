import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import barberRoutes from "./routes/barber.routes.js";
import bookingRoutes from "./routes/booking.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/barber", barberRoutes);
app.use("/api/booking", bookingRoutes);

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
