import { describe, expect, it } from "vitest";
import { renderFarcasterFrameHtml } from "@/lib/sidl/frameHtml";

describe("renderFarcasterFrameHtml", () => {
  it("renders fc:frame meta tags and button targets", () => {
    const html = renderFarcasterFrameHtml({
      title: "Test",
      imageUrl: "https://example.com/image",
      postUrl: "https://example.com/post",
      buttons: [
        { label: "A", action: "post" },
        { label: "B", action: "link", target: "https://example.com/b" },
      ],
      state: "{\"x\":1}",
    });

    expect(html).toContain('property="fc:frame"');
    expect(html).toContain('property="fc:frame:image"');
    expect(html).toContain('property="fc:frame:post_url"');
    expect(html).toContain('property="fc:frame:button:1"');
    expect(html).toContain('property="fc:frame:button:1:action"');
    expect(html).toContain('property="fc:frame:button:2:target"');
    expect(html).toContain('property="fc:frame:state"');
  });
});
