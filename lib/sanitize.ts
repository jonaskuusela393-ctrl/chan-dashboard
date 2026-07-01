import sanitizeHtml from "sanitize-html";

const textTags = [
  "a", "b", "strong", "i", "em", "u", "s", "br", "p", "span", "blockquote",
  "pre", "code", "ul", "ol", "li"
];

export function cleanHtml(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), {
    allowedTags: [...textTags, "img"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      span: ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noreferrer" })
    }
  });
}

export function cleanHtmlNoImages(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), {
    allowedTags: textTags,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noreferrer" })
    }
  });
}

export function textOnly(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), { allowedTags: [], allowedAttributes: {} }).trim();
}
