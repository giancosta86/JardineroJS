import { join } from "node:path";
import { LoggerPipelineOutput } from "@giancosta86/jardinero-sdk";
import { loadLinguisticPlugin } from "./plugins";

describe("The plugin system", () => {
  it("should load CervantesJS", () => {
    const moduleId = "@giancosta86/cervantes";
    const pluginDescriptor = loadLinguisticPlugin(
      moduleId,
      new LoggerPipelineOutput(console)
    );

    expect(pluginDescriptor.moduleId).toBe(moduleId);

    expect(pluginDescriptor.plugin.getId()).toBe(
      "info.gianlucacosta.cervantes"
    );
  });

  it("should fail loading a module without default export", () => {
    const moduleId = join(__dirname, "environment");

    expect(() => {
      loadLinguisticPlugin(moduleId, new LoggerPipelineOutput(console));
    }).toThrow(`No 'default' export found in module '${moduleId}'`);
  });
});
