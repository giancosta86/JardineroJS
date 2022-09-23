import {
  validatePotentialPlugin,
  LinguisticPlugin,
  PipelineOutput
} from "@giancosta86/jardinero-sdk";
import { filteredConsole } from "./environment";

export type LinguisticPluginDescriptor = {
  moduleId: string;
  plugin: LinguisticPlugin;
};

export function loadLinguisticPlugin(
  moduleId: string,
  pipelineOutput: PipelineOutput
): LinguisticPluginDescriptor {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const linguisticModule: any = require(moduleId);

  const potentialPluginClass = linguisticModule.default;
  if (!potentialPluginClass) {
    throw new Error(`No 'default' export found in module '${moduleId}'`);
  }

  const potentialPlugin = new potentialPluginClass(
    filteredConsole,
    pipelineOutput
  );

  validatePotentialPlugin(potentialPlugin);

  return {
    moduleId,
    plugin: potentialPlugin
  };
}
