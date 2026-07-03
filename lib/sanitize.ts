import sanitizeHtml from "sanitize-html";

const TEXT_TAGS = ["a", "b", "strong", "i", "em", "u", "s", "br", "p", "span", "blockquote", "pre", "code", "ul", "ol", "li"];

const LINK_TRANSFORM = sanitizeHtml.simpleTransform("a", {
  target: "_blank",
  rel: "noopener noreferrer nofollow",
});

export function cleanHtml(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), {
    allowedTags: TEXT_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["class"],
      blockquote: ["class"],
      code: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: { a: LINK_TRANSFORM },
  });
}

export function textOnly(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
