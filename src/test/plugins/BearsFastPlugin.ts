import { Readable } from "node:stream";
import { bubu, yogi } from "../bears";
import { bearToWikiXml } from "../wiki";
import { BearsPlugin } from "./BearsPlugin";

class BearsFastPlugin extends BearsPlugin {
  createBearReadable(): Readable {
    return Readable.from([bearToWikiXml(yogi), bearToWikiXml(bubu)]);
  }
}

export default BearsFastPlugin;
