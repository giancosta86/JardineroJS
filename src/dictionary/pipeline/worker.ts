import { parentPort, workerData } from "node:worker_threads";
import { pipeline } from "node:stream/promises";
import open, { Database } from "better-sqlite3";
import {
  LinguisticPlugin,
  ensureArray,
  PipelineOutput
} from "@giancosta86/jardinero-sdk";
import { loadLinguisticPlugin } from "../../plugins";
import { MessageFromWorker, WorkerData } from "./protocol";

function sendMessageToParent(message: MessageFromWorker): void {
  parentPort?.postMessage(message);
}

function sendTextToParent(text: string): void {
  sendMessageToParent({ type: "text", text });
}

class WorkerPipelineOutput extends PipelineOutput {
  sendText = sendTextToParent;
}

async function runDictionaryPipeline(): Promise<void> {
  const { linguisticModuleId, tempDbPath } = workerData as WorkerData;

  sendTextToParent("Initializing the pipeline...");

  const pipelineOutput = new WorkerPipelineOutput();

  const { plugin } = loadLinguisticPlugin(linguisticModuleId, pipelineOutput);

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

  const extractionTransforms = ensureArray(
    await linguisticPlugin.createExtractionTransforms()
  );

  const writableBuilder = await linguisticPlugin.createSqliteWritableBuilder();
  const writable = writableBuilder.build(tempDb);

  return pipeline([...sourceStreams, ...extractionTransforms, writable]);
}

runDictionaryPipeline();
