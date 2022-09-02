import { parentPort, workerData } from "node:worker_threads";
import { pipeline } from "node:stream/promises";
import open, { Database } from "better-sqlite3";
import { WikiTransform } from "@giancosta86/wiki-transform";
import { LinguisticPlugin, SingleOrArray } from "@giancosta86/jardinero-sdk";
import { loadLinguisticPlugin } from "../../plugin";
import { MessageFromWorker, WorkerData } from "./protocol";
import { PAGE_BATCH_SIZE } from "../../environment";

function sendMessageToParent(message: MessageFromWorker): void {
  parentPort?.postMessage(message);
}

function sendTextToParent(text: string): void {
  sendMessageToParent({ type: "text", text });
}

async function runDictionaryPipeline(): Promise<void> {
  const { linguisticModuleId, tempDbPath } = workerData as WorkerData;

  sendTextToParent("Initializing the pipeline...");

  const { plugin } = loadLinguisticPlugin(linguisticModuleId);

  const tempDb = open(tempDbPath);

  try {
    const sqliteSchema = await plugin.getSqliteSchema();

    tempDb.exec(sqliteSchema);

    await runStreamPipeline(plugin, tempDb);

    sendTextToParent("Optimizing the dictionary...");
    tempDb.exec("VACUUM");
  } finally {
    tempDb.close();
  }
}

async function runStreamPipeline(
  linguisticPlugin: LinguisticPlugin,
  tempDb: Database
): Promise<void> {
  const sourceStreams = ensureArray(
    await linguisticPlugin.createSourceStreams()
  );

  const wikiTransform = createWikiTransform();

  const pageTransforms = ensureArray(
    await linguisticPlugin.createPageTransforms()
  );

  const writableBuilder = await linguisticPlugin.createSqliteWritableBuilder();
  const writable = writableBuilder.build(tempDb);

  return pipeline([
    ...sourceStreams,
    wikiTransform,
    ...pageTransforms,
    writable
  ]);
}

function ensureArray<T>(potentialArray: SingleOrArray<T>): readonly T[] {
  return potentialArray instanceof Array ? potentialArray : [potentialArray];
}

function createWikiTransform(): WikiTransform {
  let pageCounter = 0;

  return new WikiTransform().on("data", () => {
    pageCounter++;

    if (pageCounter % PAGE_BATCH_SIZE == 0) {
      sendTextToParent(`Processed pages: ${pageCounter.toLocaleString()}`);
    }
  });
}

runDictionaryPipeline();
