import { join } from "node:path";
import { tmpdir } from "node:os";
import { unlink } from "node:fs/promises";
import { v4 as uuid4 } from "uuid";
import open, { Database } from "better-sqlite3";
import { SqliteWritableBuilder } from "@giancosta86/sqlite-writable";
import { Bear, bearsToTupleSet } from "./bears";

export async function withDb(
  dbPath: string,
  dbConsumer: (db: Database) => Promise<void>
): Promise<void> {
  const db = open(dbPath);

  try {
    await dbConsumer(db);
  } finally {
    db.close();
  }
}

export function generateTempDbPath(): string {
  return join(tmpdir(), `${uuid4()}.db`);
}

export type TempDbSettings = {
  keepFile: boolean;
};

export async function withTempDb(
  dbConsumer: (db: Database) => Promise<void>,
  settings?: TempDbSettings
): Promise<string> {
  const tempDbPath = generateTempDbPath();

  try {
    await withDb(tempDbPath, dbConsumer);
  } finally {
    if (!settings?.keepFile ?? false) {
      await unlink(tempDbPath);
    }
  }

  return tempDbPath;
}

export const BEARS_SCHEMA = `
CREATE TABLE bears (
  name TEXT NOT NULL,
  age NUMBER NOT NULL,
  PRIMARY KEY (name, age)
)`;

export class BearsDb {
  constructor(private readonly rawDb: Database) {}

  createSchema(): this {
    this.rawDb.exec(BEARS_SCHEMA);
    return this;
  }

  insertBear(bear: Bear): this {
    this.rawDb
      .prepare(
        `
      INSERT INTO bears
      (name, age)
      VALUES
      (?, ?)
    `
      )
      .run(bear.name, bear.age);

    return this;
  }

  readBears(query: string): readonly Bear[] {
    return this.rawDb
      .prepare(query)
      .all()
      .map(rowObject => ({ type: "bear", ...rowObject } as Bear));
  }

  expectBears(expectedBears: readonly Bear[]): void {
    const actualBears = this.readBears("SELECT name, age FROM bears");

    expect(bearsToTupleSet(actualBears)).toEqual(
      bearsToTupleSet(expectedBears)
    );
  }
}

export function withBearsDb(
  dbPath: string,
  dbConsumer: (db: BearsDb) => Promise<void>
): Promise<void> {
  return withDb(dbPath, async rawDb => {
    const bearsDb = new BearsDb(rawDb);
    await dbConsumer(bearsDb);
  });
}

export function withTempBearsDb(
  dbConsumer: (db: BearsDb) => Promise<void>,
  settings?: TempDbSettings
): Promise<string> {
  return withTempDb(async rawDb => {
    const bearsDb = new BearsDb(rawDb);
    await dbConsumer(bearsDb);
  }, settings);
}

export function createBearsWritableBuilder(): SqliteWritableBuilder {
  return new SqliteWritableBuilder().withType<Bear>(
    "bear",
    "INSERT INTO bears (name, age) VALUES (?, ?)",
    bear => [bear.name, bear.age]
  );
}
