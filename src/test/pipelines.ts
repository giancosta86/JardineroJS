import { DictionaryPipeline } from "../dictionary/pipeline";
import { BearsPlugin, BearsPluginClass } from "./plugins/BearsPlugin";

export function createBearsPipeline<T extends BearsPlugin>(
  pluginClass: BearsPluginClass<T>
): DictionaryPipeline {
  const pluginDescriptor = BearsPlugin.createDescriptor(pluginClass);

  return new DictionaryPipeline(
    pluginDescriptor.moduleId,
    BearsPlugin.renameToDb
  );
}

export function runBearsPipeline(pipeline: DictionaryPipeline): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    pipeline.on("success", resolve);
    pipeline.on("error", reject);
    pipeline.on("cancel", reject);

    pipeline.tryToStart();
  });
}
