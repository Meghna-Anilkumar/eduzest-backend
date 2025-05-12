import { httpServer } from "./app";
import connectDB from "./config/db";

const PORT = process.env.PORT || 5000;

connectDB();

console.log(`Starting HTTP server on port ${PORT}`);
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});