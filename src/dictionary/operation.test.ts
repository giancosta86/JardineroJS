import { existsSync } from "node:fs";
import { Bear, bubu, dodo, yogi, bearsToTupleSet } from "../test/bears";
import performSerializedDbOperation from "./operation";
import { withRemovablePath } from "../fileUtils";
import { generateTempDbPath, withBearsDb, withTempBearsDb } from "../test/db";

function expectBearsViaQueryOperation(
  dbPath: string,
  expectedBears: readonly Bear[]
): void {
  const operationOutput = performSerializedDbOperation({
    type: "executeQuery",
    dbPath,
    query: "SELECT name AS 'Bear name', age FROM bears"
  });

  if (operationOutput.type != "queryResult") {
    throw new Error(`Wrong operation output type: '${operationOutput.type}'`);
  }

  expect(operationOutput.dataSet.headers).toEqual(["Bear name", "age"]);

  expect(new Set(operationOutput.dataSet.rows)).toEqual(
    bearsToTupleSet(expectedBears)
  );
}

describe("The dictionary operation", () => {
  describe("when receiving a query request", () => {
    it("should return a data set", async () => {
      const dbPath = await withTempBearsDb(
        async db => {
          db.createSchema().insertBear(yogi).insertBear(bubu);
        },
        { keepFile: true }
      );

      await withRemovablePath(dbPath, async () => {
        expectBearsViaQueryOperation(dbPath, [yogi, bubu]);
      });
    });

    it("should throw an error upon invalid SQL", async () => {
      const dbPath = await withTempBearsDb(
        async db => {
          db.createSchema().insertBear(yogi).insertBear(bubu);
        },
        { keepFile: true }
      );

      await withRemovablePath(dbPath, async () => {
        expect(() => {
          performSerializedDbOperation({
            type: "executeQuery",
            dbPath,
            query: "WIIIIIIIII THIS IS NOT VALID SQL!"
          });
        }).toThrow("WIIIIIIIII");
      });
    });
  });

  describe("when receiving a replacement request", () => {
    it("should create a dictionary from scratch", async () => {
      const targetDbPath = generateTempDbPath();

      await withRemovablePath(targetDbPath, async () => {
        const newDbPath = await withTempBearsDb(
          async db => {
            db.createSchema().insertBear(yogi).insertBear(bubu);
          },
          { keepFile: true }
        );

        await withRemovablePath(newDbPath, async () => {
          const operationOutput = performSerializedDbOperation({
            type: "replaceDb",
            sourceDbPath: newDbPath,
            targetDbPath
          });

          expect(operationOutput.type == "dbReplaced");
          expect(existsSync(newDbPath)).toBe(false);

          await withBearsDb(targetDbPath, async db => {
            db.expectBears([yogi, bubu]);
          });
        });
      });
    });

    it("should replace an existing dictionary", async () => {
      const initialDbPath = await withTempBearsDb(
        async db => {
          db.createSchema().insertBear(dodo);
        },
        { keepFile: true }
      );

      await withRemovablePath(initialDbPath, async () => {
        const newDbPath = await withTempBearsDb(
          async db => {
            db.createSchema().insertBear(yogi).insertBear(bubu);
          },
          { keepFile: true }
        );

        await withRemovablePath(newDbPath, async () => {
          const operationOutput = performSerializedDbOperation({
            type: "replaceDb",
            sourceDbPath: newDbPath,
            targetDbPath: initialDbPath
          });

          expect(operationOutput.type == "dbReplaced");
          expect(existsSync(newDbPath)).toBe(false);

          await withBearsDb(initialDbPath, async db => {
            db.expectBears([yogi, bubu]);
          });
        });
      });
    });

    it("should replace an existing dictionary that was queried", async () => {
      const initialDbPath = await withTempBearsDb(
        async db => {
          db.createSchema().insertBear(dodo);
        },
        { keepFile: true }
      );

      await withRemovablePath(initialDbPath, async () => {
        performSerializedDbOperation({
          type: "executeQuery",
          dbPath: initialDbPath,
          query: "SELECT name AS 'Bear name', age FROM bears ORDER BY age"
        });

        const newDbPath = await withTempBearsDb(
          async db => {
            db.createSchema().insertBear(yogi).insertBear(bubu);
          },
          { keepFile: true }
        );

        await withRemovablePath(newDbPath, async () => {
          performSerializedDbOperation({
            type: "replaceDb",
            sourceDbPath: newDbPath,
            targetDbPath: initialDbPath
          });

          expectBearsViaQueryOperation(initialDbPath, [yogi, bubu]);
        });
      });
    });
  });
});
