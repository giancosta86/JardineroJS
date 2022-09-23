import { Readable } from "node:stream";
import { BearsPlugin } from "./BearsPlugin";

class BearsKaboomPlugin extends BearsPlugin {
  static readonly message = "--- KABOOM! ---";

  protected override createBearReadable(): Readable {
    throw new Error(BearsKaboomPlugin.message);
  }
}

export default BearsKaboomPlugin;
