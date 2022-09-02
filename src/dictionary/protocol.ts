import { DataSet } from "@giancosta86/jardinero-frontend";

export type DbOperationInput = Readonly<
  | {
      type: "executeQuery";
      dbPath: string;
      query: string;
    }
  | {
      type: "replaceDb";
      sourceDbPath: string;
      targetDbPath: string;
    }
>;

export type DbOperationOutput = Readonly<
  | {
      type: "queryResult";
      dataSet: DataSet;
    }
  | {
      type: "dbReplaced";
    }
>;
