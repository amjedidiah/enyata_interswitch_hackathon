import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app";
const app = createApp();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB then start server
const MONGODB_URI = process.env.MONGODB_URI!;
try {
  await mongoose.connect(MONGODB_URI);
  console.info("Connected to MongoDB");
  app.listen(PORT, () => console.info(`Server running on port ${PORT}`));
} catch (err) {
  console.error("MongoDB connection error:", err);
  process.exit(1);
}
