import { visit } from "unist-util-visit";
import type { Node, Parent } from "unist";

interface TextNode extends Node {
  type: "text";
  value: string;
}

interface ElementNode extends Parent {
  type: "element";
  tagName: string;
  children: Node[];
}

export default function remarkQuotePlugin() {
  return (tree: Node) => {
    visit(tree, "text", (node: TextNode, index, parent: Parent) => {
      const regex = /"([^"]*)"/g;
      let match;
      const newChildren: Node[] = [];
      let lastIndex = 0;

      while ((match = regex.exec(node.value)) !== null) {
        if (match.index > lastIndex) {
          newChildren.push({
            type: "text",
            value: node.value.slice(lastIndex, match.index),
          });
        }

        newChildren.push({
          type: "element",
          tagName: "q",
          children: [{ type: "text", value: match[1] }],
        });

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < node.value.length) {
        newChildren.push({
          type: "text",
          value: node.value.slice(lastIndex),
        });
      }

      if (newChildren.length > 0 && parent && typeof index === "number") {
        parent.children.splice(index, 1, {
          type: "element",
          tagName: "span",
          children: newChildren,
        } as ElementNode);
      }
    });
  };
}
