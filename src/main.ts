#!/usr/bin/env node

import process, { argv } from "node:process";
import { createServer } from "node:http";
import open from "open";
import { formatError, ErrorParts } from "@giancosta86/format-error";
import { LoggerPipelineOutput } from "@giancosta86/jardinero-sdk";
import { createBrowserApp } from "./browser";
import { setupWebSockets } from "./websockets";
import { filteredConsole, IN_PRODUCTION, PORT } from "./environment";
import { Dictionary } from "./dictionary";
import { loadLinguisticPlugin } from "./plugins";

function main(args: readonly string[]): number {
  const linguisticModuleId = args[0];
  if (!linguisticModuleId) {
    filteredConsole.error(
      "Missing command-line argument: <linguistic module id>"
    );
    return 1;
  }

  try {
    const pluginDescriptor = loadLinguisticPlugin(
      linguisticModuleId,
      new LoggerPipelineOutput(filteredConsole)
    );
    const dictionary = new Dictionary(pluginDescriptor);

    const app = createBrowserApp();
    const httpServer = createServer(app);

    setupWebSockets({
      httpServer,
      dictionary,
      plugin: pluginDescriptor.plugin
    });

    httpServer.listen(PORT, () => {
      const url = `http://localhost:${PORT}`;

      console.info("Welcome to 🌹JardineroJS! 🤗🦋");
      console.info();
      console.info(`Server listening at -> ${url}`);

      if (IN_PRODUCTION) {
        open(url);
      }
    });

    return 0;
  } catch (err) {
    filteredConsole.error(formatError(err, ErrorParts.Main));
    return 1;
  }
}

process.exitCode = main(argv.slice(2));
