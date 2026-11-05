import { RichText as LexicalRichText } from "@payloadcms/richtext-lexical/react";
import type { ComponentProps } from "react";

/** Article body at a comfortable 680px measure with site typography. */
export function ArticleBody({
  data,
}: Readonly<{ data: ComponentProps<typeof LexicalRichText>["data"] }>) {
  return (
    <div className="prose prose-neutral dark:prose-invert prose-img:rounded-md prose-headings:scroll-mt-20 max-w-[680px] text-[1.0625rem] leading-[1.7]">
      <LexicalRichText data={data} />
    </div>
  );
}
