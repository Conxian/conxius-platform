import { describe, it, expect, vi, afterEach } from "vitest";
import { createLogger } from "../lib/support/logger";

describe("createLogger log-injection hardening", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("strips CR/LF from interpolated user values so logs cannot be forged", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = createLogger("telemetry");

    log.error(`Received ${"event\n[FORGED] admin login"} from caller`);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const line = errorSpy.mock.calls[0][0] as string;
    expect(line).not.toContain("\n");
    expect(line.split("\n")).toHaveLength(1);
  });

  it("strips CR/LF from string arguments and the tag", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = createLogger("tag\nforged");

    log.warn("value", "arg\r\nforged");

    const [line, arg] = warnSpy.mock.calls[0] as [string, string];
    expect(line).not.toContain("\n");
    expect(arg).not.toContain("\n");
    expect(arg).not.toContain("\r");
  });
});
