#!/usr/bin/env node

import process, { argv } from "node:process";
import { createServer } from "node:http";
import { formatError } from "@giancosta86/format-error";
import { createBrowserApp } from "./browser";
import { enableWebSocket } from "./sockets";
import { filteredConsole, PORT } from "./environment";
import { Dictionary } from "./dictionary";
import { loadLinguisticPlugin } from "./plugin";

function main(args: readonly string[]): number {
  const linguisticModuleId = args[0];
  if (!linguisticModuleId) {
    filteredConsole.error(
      "Missing command-line argument: <linguistic module id>"
    );
    return 1;
  }

  try {
    const pluginDescriptor = loadLinguisticPlugin(linguisticModuleId);
    const dictionary = new Dictionary(pluginDescriptor);

    const app = createBrowserApp();
    const server = createServer(app);

    enableWebSocket({
      server,
      dictionary
    });

    server.listen(PORT, () => {
      console.info("Welcome to 🌹JardineroJS! 🤗🦋");
      console.info();
      console.info(`Server listening at http://localhost:${PORT}`);
    });

    return 0;
  } catch (err) {
    filteredConsole.error(formatError(err, { showCauseChain: true }));
    return 1;
  }
}

process.exitCode = main(argv.slice(2));
