import { bubu, yogi } from "../test/bears";
import { Dictionary } from "./Dictionary";
import { DictionaryPipeline } from "./pipeline";
import { createBearsPipeline } from "../test/pipelines";
import { BearsPlugin } from "../test/plugins/BearsPlugin";
import BearsFastPlugin from "../test/plugins/BearsFastPlugin";
import BearsSlowPlugin from "../test/plugins/BearsSlowPlugin";
import BearsKaboomPlugin from "../test/plugins/BearsKaboomPlugin";

async function withBearsDictionary(
  dictionaryConsumer: (dictionary: Dictionary) => Promise<void>
): Promise<void> {
  const bearsPluginDescriptor = BearsPlugin.createDescriptor(BearsFastPlugin);

  const dictionary = new Dictionary(bearsPluginDescriptor);

  try {
    await dictionaryConsumer(dictionary);
  } finally {
    const exitCode = await dictionary.close();
    expect(exitCode).toBe(0);
  }
}

function runPipeline(dictionary: Dictionary): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    dictionary.pipeline
      .on("cancel", reject)
      .on("error", reject)
      .on("success", resolve)
      .tryToStart();
  });
}

function injectPipeline(
  dictionary: Dictionary,
  pipeline: DictionaryPipeline
): void {
  (dictionary as any).pipeline = pipeline;
}

describe("Dictionary", () => {
  beforeEach(async () => {
    await BearsPlugin.removeDbDirectory();
  });

  afterEach(async () => {
    await BearsPlugin.removeDbDirectory();
  });

  describe("executing queries", () => {
    describe("when the underlying db is missing", () => {
      it("should throw an error", () =>
        withBearsDictionary(async dictionary => {
          const promise = dictionary.executeQuery("SELECT * FROM bears");

          await expect(promise).rejects.toThrow("Cannot open database");
        }));
    });

    describe("when the underlying db exists", () => {
      it("should return the existing rows", async () => {
        await BearsPlugin.withDb(async db => {
          db.createSchema().insertBear(yogi).insertBear(bubu);
        });

        await withBearsDictionary(async dictionary => {
          const dataSet = await dictionary.executeQuery(
            "SELECT name AS 'Bear Name', age FROM bears ORDER BY age"
          );

          expect(dataSet.headers).toEqual(["Bear Name", "age"]);

          expect(dataSet.rows).toEqual([
            [bubu.name, bubu.age],
            [yogi.name, yogi.age]
          ]);
        });
      });
    });
  });

  describe("the status", () => {
    describe("upon creation", () => {
      describe("when the underlying db is missing", () => {
        it("should have no message", async () => {
          await withBearsDictionary(async dictionary => {
            const status = await dictionary.getStatus();
            expect(status.statusMessage).toBe(null);
          });
        });
      });

      describe("when the underlying db exists", () => {
        it("should have some message", async () => {
          await BearsPlugin.withDb(async db => {
            db.createSchema();
          });

          await withBearsDictionary(async dictionary => {
            const status = await dictionary.getStatus();
            expect(status.statusMessage).toMatch(/^Dictionary updated on:/);
          });
        });
      });

      it("should have no pipeline message", async () => {
        await withBearsDictionary(async dictionary => {
          const status = await dictionary.getStatus();
          expect(status.pipelineMessage).toBe(null);
        });
      });

      it("should have no latest pipeline error", async () => {
        await withBearsDictionary(async dictionary => {
          const status = await dictionary.getStatus();
          expect(status.errorInPreviousPipeline).toBe(null);
        });
      });
    });

    describe("when the pipeline succeeds", () => {
      it("should have a different status message", async () => {
        await withBearsDictionary(async dictionary => {
          const initialStatus = await dictionary.getStatus();

          injectPipeline(dictionary, createBearsPipeline(BearsSlowPlugin));
          await runPipeline(dictionary);

          const finalStatus = await dictionary.getStatus();
          expect(finalStatus.statusMessage).not.toBe(
            initialStatus.statusMessage
          );
        });
      });

      it("should return the new data", async () => {
        await withBearsDictionary(async dictionary => {
          await runPipeline(dictionary);

          const dataSet = await dictionary.executeQuery(
            "SELECT name, age FROM bears ORDER BY age"
          );

          expect(dataSet.headers).toEqual(["name", "age"]);

          expect(dataSet.rows).toEqual([
            [bubu.name, bubu.age],
            [yogi.name, yogi.age]
          ]);
        });
      });

      it("should have no latest pipeline message", async () => {
        await withBearsDictionary(async dictionary => {
          await runPipeline(dictionary);

          const status = await dictionary.getStatus();
          expect(status.pipelineMessage).toBe(null);
        });
      });

      it("should have no latest pipeline error", async () => {
        await withBearsDictionary(async dictionary => {
          await runPipeline(dictionary);

          const status = await dictionary.getStatus();
          expect(status.errorInPreviousPipeline).toBe(null);
        });
      });
    });

    describe("when the pipeline fails", () => {
      it("should have no latest pipeline message", async () => {
        await withBearsDictionary(async dictionary => {
          injectPipeline(dictionary, createBearsPipeline(BearsKaboomPlugin));
          await expect(runPipeline(dictionary)).rejects.toThrow(
            BearsKaboomPlugin.message
          );

          const status = await dictionary.getStatus();
          expect(status.pipelineMessage).toBe(null);
        });
      });

      it("should have the latest pipeline error", async () => {
        await withBearsDictionary(async dictionary => {
          injectPipeline(dictionary, createBearsPipeline(BearsKaboomPlugin));
          await expect(runPipeline(dictionary)).rejects.toThrow(
            BearsKaboomPlugin.message
          );

          const status = await dictionary.getStatus();
          expect(status.errorInPreviousPipeline).toBe(
            `Error: ${BearsKaboomPlugin.message}`
          );
        });
      });
    });

    describe("when the pipeline fails and then succeeds", () => {
      it("should have no latest pipeline error", async () => {
        await withBearsDictionary(async dictionary => {
          injectPipeline(dictionary, createBearsPipeline(BearsKaboomPlugin));
          await expect(runPipeline(dictionary)).rejects.toThrow(
            BearsKaboomPlugin.message
          );

          injectPipeline(dictionary, createBearsPipeline(BearsFastPlugin));
          await runPipeline(dictionary);

          const status = await dictionary.getStatus();
          expect(status.errorInPreviousPipeline).toBe(null);
        });
      });
    });
  });
});
