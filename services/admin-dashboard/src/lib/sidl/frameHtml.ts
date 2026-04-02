type FrameButton = {
  label: string;
  action?: "post" | "post_redirect" | "link";
  target?: string;
};

export function renderFarcasterFrameHtml(input: {
  title: string;
  imageUrl: string;
  postUrl: string;
  buttons: [FrameButton, ...FrameButton[]];
  state?: string;
}): string {
  const escapedTitle = escapeHtml(input.title);

  const meta: string[] = [];
  meta.push(`<meta property="og:title" content="${escapedTitle}" />`);
  meta.push(`<meta property="og:image" content="${escapeAttr(input.imageUrl)}" />`);
  meta.push(`<meta property="fc:frame" content="vNext" />`);
  meta.push(`<meta property="fc:frame:image" content="${escapeAttr(input.imageUrl)}" />`);
  meta.push(`<meta property="fc:frame:post_url" content="${escapeAttr(input.postUrl)}" />`);

  input.buttons.forEach((b, i) => {
    meta.push(`<meta property="fc:frame:button:${i + 1}" content="${escapeAttr(b.label)}" />`);

    if (typeof b.action === "string") {
      meta.push(`<meta property="fc:frame:button:${i + 1}:action" content="${escapeAttr(b.action)}" />`);
    }
    if (typeof b.target === "string") {
      meta.push(`<meta property="fc:frame:button:${i + 1}:target" content="${escapeAttr(b.target)}" />`);
    }
  });

  if (typeof input.state === "string") {
    meta.push(`<meta property="fc:frame:state" content="${escapeAttr(input.state)}" />`);
  }

  return `<!doctype html>
<html>
  <head>
    <title>${escapedTitle}</title>
    ${meta.join("\n    ")}
  </head>
  <body></body>
</html>`;
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>]/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      default:
        return c;
    }
  });
}

function escapeAttr(input: string): string {
  return escapeHtml(input).replace(/"/g, "&quot;");
}
