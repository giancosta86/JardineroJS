import { join } from "node:path";
import express, { Express } from "express";
import { QueryParams } from "@giancosta86/jardinero-frontend";
import { FRONTEND_SERVER_URL, IN_PRODUCTION, PORT } from "./environment";

export function createBrowserApp(): Express {
  const app = express();

  if (IN_PRODUCTION) {
    const staticFrontendDirectory = join(__dirname, "frontend");
    app.use(express.static(staticFrontendDirectory));
  } else {
    app.get("/", (req, res) => {
      const frontendServerUrl = `${FRONTEND_SERVER_URL}${req.url}?${QueryParams.BackendPort}=${PORT}`;
      res.redirect(frontendServerUrl);
    });
  }

  return app;
}
