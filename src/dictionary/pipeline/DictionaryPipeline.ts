import { Worker } from "node:worker_threads";
import { join } from "node:path";
import EventEmitter from "node:events";
import { tmpdir } from "node:os";
import { v4 as uuid4 } from "uuid";
import { MessageFromWorker, WorkerData } from "./protocol";
import { filteredConsole } from "../../environment";
import { rimraf } from "../../fileUtils";

const workerModuleId = join(__dirname, "worker");

const EVENT_START = "start";
const EVENT_CANCEL = "cancel";
const EVENT_SUCCESS = "success";
const EVENT_ERROR = "error";
const EVENT_TEXT_MESSAGE = "text_message";

type ExecutionContext = Readonly<{
  worker: Worker;
  tempDbPath: string;
  canceled: boolean;
  error?: Error;
}>;

export class DictionaryPipeline {
  private readonly emitter = new EventEmitter();

  private _latestTextMessage?: string;
  private _latestError?: Error;

  private executionContext?: ExecutionContext;

  constructor(
    private readonly linguisticModuleId: string,
    private readonly replaceDb: (tempDbPath: string) => Promise<void>
  ) {}

  get latestTextMessage(): string | undefined {
    return this._latestTextMessage;
  }

  get latestError(): Error | undefined {
    return this._latestError;
  }

  tryToStart(): void {
    if (this.executionContext) {
      filteredConsole.warn("Pipeline already running!");
      return;
    }

    const tempDbPath = join(tmpdir(), `${uuid4()}.db`);

    const workerData: WorkerData = {
      linguisticModuleId: this.linguisticModuleId,
      tempDbPath
    };

    const worker = new Worker(workerModuleId, {
      workerData
    })
      .on("message", this.handleWorkerMessage.bind(this))
      .on("error", this.handleWorkerError.bind(this))
      .on("messageerror", this.handleWorkerError.bind(this))
      .on("exit", this.handleWorkerExit.bind(this));

    this.executionContext = {
      worker,
      tempDbPath,
      canceled: false
    };

    this.emitter.emit(EVENT_START);
  }

  tryToCancel(): void {
    if (!this.executionContext) {
      filteredConsole.warn("No pipeline is running!");
      return;
    }

    this.executionContext = { ...this.executionContext, canceled: true };

    this.executionContext.worker.terminate();
  }

  private handleWorkerMessage(msg: MessageFromWorker): void {
    switch (msg.type) {
      case "text":
        this._latestTextMessage = msg.text;
        this.emitter.emit(EVENT_TEXT_MESSAGE, msg.text);
        return;
    }
  }

  private handleWorkerError(err: Error): void {
    if (!this.executionContext) {
      throw new Error("Missing execution context");
    }

    this.executionContext = { ...this.executionContext, error: err };
  }

  private async handleWorkerExit(): Promise<void> {
    this._latestTextMessage = undefined;

    const closingExecutionContext = this.executionContext;
    this.executionContext = undefined;

    if (!closingExecutionContext) {
      throw new Error("Missing execution context");
    }

    this._latestError = closingExecutionContext.error;

    if (closingExecutionContext.error) {
      try {
        await rimraf(closingExecutionContext.tempDbPath);
        return;
      } finally {
        this.emitter.emit(EVENT_ERROR, closingExecutionContext.error);
      }
    }

    if (closingExecutionContext.canceled) {
      try {
        await rimraf(closingExecutionContext.tempDbPath);
        return;
      } finally {
        this.emitter.emit(EVENT_CANCEL);
      }
    }

    await this.replaceDb(closingExecutionContext.tempDbPath);

    this.emitter.emit(EVENT_SUCCESS);
  }

  on(eventName: typeof EVENT_START, callback: () => void): this;
  on(
    eventName: typeof EVENT_TEXT_MESSAGE,
    callback: (text: string) => void
  ): this;
  on(eventName: typeof EVENT_CANCEL, callback: () => void): this;
  on(eventName: typeof EVENT_SUCCESS, callback: () => void): this;
  on(eventName: typeof EVENT_ERROR, callback: (err: Error) => void): this;
  on(eventName: string, callback: (...args: any) => void): this {
    this.emitter.on(eventName, callback);
    return this;
  }

  once(eventName: typeof EVENT_START, callback: () => void): this;
  once(
    eventName: typeof EVENT_TEXT_MESSAGE,
    callback: (text: string) => void
  ): this;
  once(eventName: typeof EVENT_CANCEL, callback: () => void): this;
  once(eventName: typeof EVENT_SUCCESS, callback: () => void): this;
  once(eventName: typeof EVENT_ERROR, callback: (err: Error) => void): this;
  once(eventName: string, callback: (...args: any) => void): this {
    this.emitter.once(eventName, callback);
    return this;
  }
}
