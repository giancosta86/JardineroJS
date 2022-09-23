import { rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { Readable, Transform } from "node:stream";
import {
  LoggerPipelineOutput,
  LinguisticPlugin,
  PipelineOutput
} from "@giancosta86/jardinero-sdk";
import { SqliteWritableBuilder } from "@giancosta86/sqlite-writable";
import { Logger } from "@giancosta86/unified-logging";
import { WikiTransform } from "@giancosta86/wiki-transform";
import { PageToBearTransform } from "../wiki";
import {
  BearsDb,
  BEARS_SCHEMA,
  createBearsWritableBuilder,
  withBearsDb
} from "../db";
import { LinguisticPluginDescriptor } from "../../plugins";
import { rimraf } from "../../fileUtils";

export type BearsPluginClass<T extends BearsPlugin> = new (
  logger: Logger,
  pipelineOutput: PipelineOutput
) => T;

export abstract class BearsPlugin extends LinguisticPlugin {
  private static readonly id = "info.gianlucacosta.jardinero.test.bears";

  private static readonly dbDirectory = join(
    homedir(),
    ".jardinero",
    BearsPlugin.id
  );

  private static readonly dbPath = join(
    BearsPlugin.dbDirectory,
    "dictionary.db"
  );

  static async renameToDb(sourceDbPath: string): Promise<void> {
    await mkdir(BearsPlugin.dbDirectory, { recursive: true });
    return rename(sourceDbPath, BearsPlugin.dbPath);
  }

  static createDescriptor<T extends BearsPlugin>(
    pluginClass: BearsPluginClass<T>
  ): LinguisticPluginDescriptor {
    const moduleId = join(__dirname, pluginClass.name);

    return {
      moduleId,
      plugin: new pluginClass(console, new LoggerPipelineOutput(console))
    };
  }

  static removeDbDirectory(): Promise<void> {
    return rimraf(BearsPlugin.dbDirectory);
  }

  static async withDb(
    dbConsumer: (db: BearsDb) => Promise<void>
  ): Promise<void> {
    await mkdir(BearsPlugin.dbDirectory, { recursive: true });

    return withBearsDb(BearsPlugin.dbPath, dbConsumer);
  }

  getId(): string {
    return BearsPlugin.id;
  }

  getName(): string {
    return "Yellowstone Plugin";
  }

  getSqliteSchema(): string {
    return BEARS_SCHEMA;
  }

  protected abstract createBearReadable(): Readable;

  createSourceStreams(): Readable {
    return this.createBearReadable();
  }

  createExtractionTransforms(): readonly Transform[] {
    return [new WikiTransform(), new PageToBearTransform()];
  }

  createSqliteWritableBuilder(): SqliteWritableBuilder {
    return createBearsWritableBuilder();
  }
}
