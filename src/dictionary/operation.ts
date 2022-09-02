import { mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import open from "better-sqlite3";
import { DataSet } from "@giancosta86/jardinero-frontend";
import { DbOperationInput, DbOperationOutput } from "./protocol";

function performSerializedDbOperation(
  param: DbOperationInput
): DbOperationOutput {
  switch (param.type) {
    case "executeQuery": {
      const dataSet = executeQuery(param.dbPath, param.query);
      return { type: "queryResult", dataSet };
    }

    case "replaceDb":
      replaceDb(param.sourceDbPath, param.targetDbPath);
      return { type: "dbReplaced" };
  }
}

function executeQuery(dbPath: string, query: string): DataSet {
  const db = open(dbPath);

  try {
    const statement = db.prepare(query);

    const rowsAsObjects = statement.all();

    const rowsAsArrays = rowsAsObjects.map(rowAsObject =>
      Object.values(rowAsObject)
    );

    return {
      headers: statement.columns().map(column => column.name),
      rows: rowsAsArrays
    };
  } finally {
    db.close();
  }
}

function replaceDb(sourceDbPath: string, targetDbPath: string): void {
  mkdirSync(dirname(targetDbPath), {
    recursive: true
  });

  renameSync(sourceDbPath, targetDbPath);
}

export = performSerializedDbOperation;
