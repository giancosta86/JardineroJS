import { setTimeout as delay } from "node:timers/promises";
import { Transform, TransformCallback } from "node:stream";
import { wikiPageToXml, WikiPage } from "@giancosta86/wiki-transform";
import { Bear } from "./bears";

export function bearToWikiXml(bear: Bear): string {
  const bearPage: WikiPage = { title: bear.name, text: bear.age.toString() };
  return wikiPageToXml(bearPage);
}

export async function bearToWikiXmlWithDelay(
  bear: Bear,
  delayInMillis = 2000
): Promise<string> {
  await delay(delayInMillis);
  return bearToWikiXml(bear);
}

export class PageToBearTransform extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  override _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    const page = chunk as WikiPage;

    const bear: Bear = {
      type: "bear",
      name: page.title,
      age: Number(page.text)
    };

    this.push(bear);

    callback();
  }
}
