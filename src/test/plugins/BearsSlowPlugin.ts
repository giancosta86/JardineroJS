import { Readable } from "node:stream";
import { bubu, yogi } from "../bears";
import { bearToWikiXmlWithDelay } from "../wiki";
import { BearsPlugin } from "./BearsPlugin";

class BearsSlowPlugin extends BearsPlugin {
  protected override createBearReadable(): Readable {
    return Readable.from([
      bearToWikiXmlWithDelay(yogi),
      bearToWikiXmlWithDelay(bubu)
    ]);
  }
}

export default BearsSlowPlugin;
