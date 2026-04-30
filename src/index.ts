import { createAPP } from "./app";
import { Bootstrap } from "@/server/bootstrap";
import "@/config/config.env";

//validate env

const app = createAPP();

Bootstrap(app, {
  host: "0.0.0.0",
  port: 3000,
}).catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});

