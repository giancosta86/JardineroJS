import { Server as HttpServer } from "node:http";
import {
  FrontendWebSocketServer,
  SocketMessages,
  DictionaryStatus,
  CommandResponse,
  FrontendWebSocket
} from "@giancosta86/jardinero-frontend";
import { LinguisticPlugin } from "@giancosta86/jardinero-sdk";
import { formatError, ErrorParts } from "@giancosta86/format-error";
import { filteredConsole, IN_PRODUCTION } from "./environment";
import { Dictionary } from "./dictionary";

export type WebSocketSettings = {
  httpServer: HttpServer;
  dictionary: Dictionary;
  plugin: LinguisticPlugin;
};

export function setupWebSockets({
  httpServer,
  dictionary,
  plugin
}: WebSocketSettings): void {
  const pluginName = plugin.getName();
  const startupQuery = plugin.getStartupQuery();

  const socketServer = new FrontendWebSocketServer({
    httpServer,
    enableCors: !IN_PRODUCTION,
    logger: filteredConsole,
    pluginName,
    startupQuery,
    onNewClient: webSocket => registerSocketListeners(webSocket, dictionary)
  });

  registerPipelineListeners(socketServer, dictionary);
}

function registerPipelineListeners(
  socketServer: FrontendWebSocketServer,
  dictionary: Dictionary
) {
  async function broadcastDictionaryStatus(): Promise<void> {
    const dictionaryStatus: DictionaryStatus = await dictionary.getStatus();

    socketServer.broadcastDictionaryStatus(dictionaryStatus);
  }

  dictionary.pipeline.on("start", broadcastDictionaryStatus);

  dictionary.pipeline.on("success", broadcastDictionaryStatus);

  dictionary.pipeline.on("cancel", broadcastDictionaryStatus);

  dictionary.pipeline.on("error", broadcastDictionaryStatus);

  dictionary.pipeline.on("text_message", broadcastDictionaryStatus);
}

function registerSocketListeners(
  webSocket: FrontendWebSocket,
  dictionary: Dictionary
) {
  webSocket.on(SocketMessages.StartPipeline, () => {
    dictionary.pipeline.tryToStart();
  });

  webSocket.on(SocketMessages.CancelPipeline, () => {
    dictionary.pipeline.tryToCancel();
  });

  webSocket.on(SocketMessages.DictionaryStatusRequest, async () => {
    const dictionaryStatus = await dictionary.getStatus();

    webSocket.sendDictionaryStatus(dictionaryStatus);
  });

  webSocket.on(SocketMessages.RunCommand, async command => {
    let commandResponse: CommandResponse;

    try {
      const dataSet = await dictionary.executeQuery(command);
      commandResponse = {
        dataSet,
        exception: null
      };
    } catch (err) {
      commandResponse = {
        dataSet: null,
        exception: formatError(err, ErrorParts.Message)
      };
    }

    webSocket.sendCommandResponse(commandResponse);
  });
}
