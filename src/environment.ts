import { getEnvString, getEnvNumber } from "@giancosta86/typed-env";
import { isInProduction } from "@giancosta86/typed-env";
import { FilterLogger, LogLevel } from "@giancosta86/unified-logging";

export const PORT = getEnvNumber("JARDINERO_PORT", 7000);

export const FRONTEND_SERVER_URL = getEnvString(
  "JARDINERO_FRONTEND_SERVER_URL",
  "http://localhost:8080"
);

export const IN_PRODUCTION = isInProduction(true);

export const filteredConsole = new FilterLogger(console).setLevel(
  IN_PRODUCTION ? LogLevel.Error : LogLevel.Info
);
