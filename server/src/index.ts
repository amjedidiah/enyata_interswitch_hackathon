import "dotenv/config";
import mongoose from "mongoose";
import consola from "consola";
import { createApp } from "./app";
import { startCronJobs } from "./services/cronJobs";

const app = createApp();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB then start server
const MONGODB_URI = process.env.MONGODB_URI!;
try {
  await mongoose.connect(MONGODB_URI);
  consola.info("Connected to MongoDB");
  startCronJobs();
  app.listen(PORT, () => consola.info(`Server running on port ${PORT}`));
} catch (err) {
  consola.error("MongoDB connection error:", err);
  process.exit(1);
}
