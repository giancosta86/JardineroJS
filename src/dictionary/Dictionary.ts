import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { stat, mkdir } from "node:fs/promises";
import { DataSet, DictionaryStatus } from "@giancosta86/jardinero-frontend";
import { PromiseAgent } from "@giancosta86/worker-agent";
import { formatError, ErrorParts } from "@giancosta86/format-error";
import { LinguisticPlugin } from "@giancosta86/jardinero-sdk";
import { DbOperationInput, DbOperationOutput } from "./protocol";
import { filteredConsole } from "../environment";
import { LinguisticPluginDescriptor } from "../plugins";
import { DictionaryPipeline } from "./pipeline";

const operationModuleId = join(__dirname, "operation");

export class Dictionary {
  private readonly dbPath: string;
  private readonly plugin: LinguisticPlugin;

  public readonly pipeline: DictionaryPipeline;

  private readonly agent = new PromiseAgent<
    DbOperationInput,
    DbOperationOutput
  >(operationModuleId);

  constructor(pluginDescriptor: LinguisticPluginDescriptor) {
    this.plugin = pluginDescriptor.plugin;

    this.dbPath = join(
      homedir(),
      ".jardinero",
      pluginDescriptor.plugin.getId(),
      "dictionary.db"
    );

    this.pipeline = new DictionaryPipeline(
      pluginDescriptor.moduleId,
      this.replace.bind(this)
    );
  }

  async getStatus(): Promise<DictionaryStatus> {
    const statusMessage = await this.getStatusMessage();

    return {
      statusMessage,
      pipelineMessage: this.pipeline.latestTextMessage ?? null,
      errorInPreviousPipeline: this.pipeline.latestError
        ? formatError(this.pipeline.latestError, ErrorParts.Message)
        : null
    };
  }

  private async getStatusMessage(): Promise<string | null> {
    try {
      const dbStats = await stat(this.dbPath);
      return `Dictionary updated on: ${dbStats.mtime.toLocaleString()}`;
    } catch {
      filteredConsole.info(`Missing db file '${this.dbPath}'.`);
      return null;
    }
  }

  async executeQuery(query: string): Promise<DataSet> {
    const sqlQuery = (await this.plugin.translateQueryToSql?.(query)) ?? query;

    const dbOperationOutput = await this.agent.runOperation({
      type: "executeQuery",
      dbPath: this.dbPath,
      query: sqlQuery
    });

    if (dbOperationOutput.type != "queryResult") {
      throw new Error(
        `Invalid output type at this point: '${dbOperationOutput.type}'`
      );
    }

    return dbOperationOutput.dataSet;
  }

  private async replace(sourceDbPath: string): Promise<void> {
    await mkdir(dirname(this.dbPath), { recursive: true });

    await this.agent.runOperation({
      type: "replaceDb",
      sourceDbPath,
      targetDbPath: this.dbPath
    });
  }

  async close(): Promise<number> {
    return this.agent.requestExit();
  }
}
