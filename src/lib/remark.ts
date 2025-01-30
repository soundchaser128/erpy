import type { Plugin } from "svelte-exmarkdown";
import type { Root } from "hast";
import { findAndReplace } from "hast-util-find-and-replace";
import { h } from "hastscript";

function rehypeQuotes() {
  return (tree: Root) => {
    findAndReplace(tree, [
      [
        /["”“](.*?)["”“]/g,
        function ($0) {
          return h("span", { class: "text-white" }, $0);
        },
      ],
    ]);
  };
}

export const remarkHighlightQuotes = (): Plugin => ({ rehypePlugin: rehypeQuotes });
