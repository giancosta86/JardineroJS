export type WorkerData = Readonly<{
  linguisticModuleId: string;
  tempDbPath: string;
}>;

export type MessageFromWorker = Readonly<{
  type: "text";
  text: string;
}>;
