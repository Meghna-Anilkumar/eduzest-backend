import { app, httpServer } from "./app";
import connectDB from "./config/db";

const PORT = process.env.PORT || 5000;

connectDB();

console.log(`[Index] Starting HTTP server on port ${PORT}`);
httpServer.listen(PORT, () => {
  console.log(`[Index] Server is running on port ${PORT}`);
});