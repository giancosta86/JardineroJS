import { join } from "node:path";
import { loadLinguisticPlugin } from "./plugin";

describe("The plugin system", () => {
  it("should load CervantesJS", () => {
    const moduleId = "@giancosta86/cervantes";
    const pluginDescriptor = loadLinguisticPlugin(moduleId);

    expect(pluginDescriptor.moduleId).toBe(moduleId);

    expect(pluginDescriptor.plugin.getId()).toBe(
      "info.gianlucacosta.cervantes"
    );
  });

  it("should fail loading a module without default export", () => {
    const moduleId = join(__dirname, "environment");

    expect(() => {
      loadLinguisticPlugin(moduleId);
    }).toThrow(`No 'default' export found in module '${moduleId}'`);
  });
});
