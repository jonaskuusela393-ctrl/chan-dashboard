import sanitizeHtml from "sanitize-html";

const TEXT_TAGS = [
  "a",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "br",
  "p",
  "span",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
];

const LINK_TRANSFORM = sanitizeHtml.simpleTransform("a", {
  target: "_blank",
  rel: "noopener noreferrer nofollow",
});

const TEXT_HTML_OPTIONS: sanitizeHtml.IOptions = {
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
  transformTags: {
    a: LINK_TRANSFORM,
  },
};

/**
 * Safe HTML for posts/comments.
 * No images. Use separate clickable file buttons for images.
 */
export function cleanHtml(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), TEXT_HTML_OPTIONS);
}

/**
 * Same as cleanHtml. Kept so old imports do not break.
 */
export function cleanHtmlNoImages(value: unknown): string {
  return cleanHtml(value);
}

/**
 * Plain text only.
 */
export function textOnly(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Only use this if you intentionally want images somewhere.
 * Do not use it for DreamViews or 4chan comments.
 */
export function cleanHtmlAllowImages(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), {
    ...TEXT_HTML_OPTIONS,
    allowedTags: [...TEXT_TAGS, "img"],
    allowedAttributes: {
      ...TEXT_HTML_OPTIONS.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    transformTags: {
      a: LINK_TRANSFORM,
      img: sanitizeHtml.simpleTransform("img", {
        loading: "lazy",
      }),
    },
  });
}