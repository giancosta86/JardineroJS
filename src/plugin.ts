import { LinguisticPlugin } from "@giancosta86/jardinero-sdk";
import { filteredConsole } from "./environment";

export type LinguisticPluginDescriptor = {
  moduleId: string;
  plugin: LinguisticPlugin;
};

export function loadLinguisticPlugin(
  moduleId: string
): LinguisticPluginDescriptor {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const linguisticModule: any = require(moduleId);

  const potentialPluginClass = linguisticModule.default;
  if (!potentialPluginClass) {
    throw new Error(`No 'default' export found in module '${moduleId}'`);
  }

  const potentialPlugin = new potentialPluginClass(filteredConsole);

  checkPluginInterface(potentialPlugin);

  return {
    moduleId,
    plugin: potentialPlugin
  };
}

function checkPluginInterface(potentialPlugin: any) {
  const EXPECTED_PLUGIN_KEYS = [
    "getId",
    "getSqliteSchema",
    "createSourceStreams",
    "createPageTransforms",
    "createSqliteWritableBuilder"
  ];

  EXPECTED_PLUGIN_KEYS.forEach(expectedKey => {
    if (potentialPlugin[expectedKey] === undefined) {
      throw new Error(
        `The requested linguistic plugin object does not contain an expected key: '${expectedKey}'`
      );
    }
  });
}
