import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import {
  SocketMessages,
  DictionaryStatus,
  CommandResponse
} from "@giancosta86/jardinero-frontend";
import { formatError } from "@giancosta86/format-error";
import { filteredConsole, IN_PRODUCTION } from "./environment";
import { Dictionary } from "./dictionary";

export type WebSocketSettings = {
  server: HttpServer;
  dictionary: Dictionary;
};

export function enableWebSocket({
  server,
  dictionary
}: WebSocketSettings): void {
  const io = createSocket(server);

  registerPipelineListeners(io, dictionary);

  registerSocketListeners(io, dictionary);
}

function createSocket(server: HttpServer): Server {
  const socketOptions = IN_PRODUCTION
    ? {}
    : {
        cors: {
          origin: "*"
        }
      };

  return new Server(server, socketOptions);
}

function registerPipelineListeners(io: Server, dictionary: Dictionary) {
  async function broadcastDictionaryStatus(): Promise<void> {
    const dictionaryStatus: DictionaryStatus = await dictionary.getStatus();

    io.sockets.emit(SocketMessages.DictionaryStatusResponse, dictionaryStatus);
  }

  dictionary.pipeline.on("start", broadcastDictionaryStatus);

  dictionary.pipeline.on("success", broadcastDictionaryStatus);

  dictionary.pipeline.on("cancel", broadcastDictionaryStatus);

  dictionary.pipeline.on("error", broadcastDictionaryStatus);

  dictionary.pipeline.on("text_message", broadcastDictionaryStatus);
}

function registerSocketListeners(io: Server, dictionary: Dictionary) {
  io.on("connect", socket => {
    filteredConsole.info("CONNECTION! ^__^");

    socket.on(SocketMessages.StartPipeline, () => {
      filteredConsole.info("Start pipeline! ^__^");
      dictionary.pipeline.tryToStart();
    });

    socket.on(SocketMessages.CancelPipeline, () => {
      filteredConsole.info("Cancel pipeline! ^__^");
      dictionary.pipeline.tryToCancel();
    });

    socket.on(SocketMessages.DictionaryStatusRequest, async () => {
      filteredConsole.info("Dictionary status request! ^__^");

      const dictionaryStatus = await dictionary.getStatus();
      filteredConsole.info("---> Now sending individual status response");

      socket.emit(SocketMessages.DictionaryStatusResponse, dictionaryStatus);
    });

    socket.on(SocketMessages.RunCommand, async command => {
      filteredConsole.info("Run command! ^__^");

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
          exception: formatError(err, { showClass: false })
        };
      }

      socket.emit(SocketMessages.CommandResponse, commandResponse);
    });
  });
}
