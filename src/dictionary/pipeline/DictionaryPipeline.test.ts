import { join } from "node:path";
import { DictionaryPipeline } from "./DictionaryPipeline";
import { createBearsPipeline, runBearsPipeline } from "../../test/pipelines";
import { bubu, yogi } from "../../test/bears";
import { BearsPlugin } from "../../test/plugins/BearsPlugin";
import BearsFastPlugin from "../../test/plugins/BearsFastPlugin";
import BearsSlowPlugin from "../../test/plugins/BearsSlowPlugin";
import BearsKaboomPlugin from "../../test/plugins/BearsKaboomPlugin";

describe("The dictionary pipeline", () => {
  beforeEach(async () => {
    await BearsPlugin.removeDbDirectory();
  });

  afterEach(async () => {
    await BearsPlugin.removeDbDirectory();
  });

  describe("upon construction", () => {
    it("should have no latest text message", () => {
      const pipeline = createBearsPipeline(BearsFastPlugin);
      expect(pipeline.latestTextMessage).toBeUndefined();
    });

    it("should have no latest error", () => {
      const pipeline = createBearsPipeline(BearsFastPlugin);
      expect(pipeline.latestError).toBeUndefined();
    });

    it("should not react to cancelation requests", async () => {
      let cancelCounter = 0;

      const pipeline = createBearsPipeline(BearsSlowPlugin).on("cancel", () => {
        cancelCounter++;
      });

      pipeline.tryToCancel();

      expect(cancelCounter).toBe(0);
    });
  });

  describe("when created with an inexisting module id", () => {
    it("should emit an error event", async () => {
      const inexistingModuleId = join(__dirname, "--INEXISTING--");

      const pipelinePromise = new Promise<void>((resolve, reject) => {
        new DictionaryPipeline(inexistingModuleId, BearsPlugin.renameToDb)
          .on("success", resolve)
          .on("error", reject)
          .tryToStart();
      });

      await expect(pipelinePromise).rejects.toThrow(
        /Cannot find module.*?--INEXISTING--/
      );
    });
  });

  it("should store items into the dictionary", async () => {
    const pipeline = createBearsPipeline(BearsFastPlugin);

    await runBearsPipeline(pipeline);

    await BearsPlugin.withDb(async db => {
      db.expectBears([yogi, bubu]);
    });
  });

  describe("when running a slow process", () => {
    it("should store items into the dictionary", async () => {
      const pipeline = createBearsPipeline(BearsSlowPlugin);

      await runBearsPipeline(pipeline);

      await BearsPlugin.withDb(async db => {
        db.expectBears([yogi, bubu]);
      });
    });

    it("should be cancelable", async () => {
      const canceled = await new Promise<boolean>((resolve, reject) => {
        const pipeline = createBearsPipeline(BearsSlowPlugin)
          .on("cancel", () => resolve(true))
          .on("success", () => resolve(false))
          .on("error", reject);

        pipeline.tryToStart();

        setTimeout(() => {
          pipeline.tryToCancel();
        }, 150);
      });

      expect(canceled).toBe(true);
    });

    it("should not react to subsequent start requests", async () => {
      const totalStarts = await new Promise<number>(resolve => {
        let startCounter = 0;

        const pipeline = createBearsPipeline(BearsSlowPlugin)
          .on("start", () => {
            startCounter++;
          })
          .on("cancel", () => {
            resolve(startCounter);
          });

        pipeline.tryToStart();

        setTimeout(() => {
          pipeline.tryToStart();
          pipeline.tryToCancel();
        }, 150);
      });

      expect(totalStarts).toBe(1);
    });
  });

  describe("when running a crashing process", () => {
    it("should emit an error event", async () => {
      const error = await new Promise<Error>((resolve, reject) => {
        const pipeline = createBearsPipeline(BearsKaboomPlugin)
          .on("success", reject)
          .on("cancel", reject)
          .on("error", resolve);

        pipeline.tryToStart();
      });

      expect(error.message).toBe(BearsKaboomPlugin.message);
    });
  });
});
