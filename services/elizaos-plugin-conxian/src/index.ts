import type { Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { z } from "zod";
import { createConxianActions } from "./actions";
import { parseConxianEnv } from "./conxianClient";

const nullableUrl = z.preprocess((v) => (v === null ? undefined : v), z.string().url().optional());

const configSchema = z.object({
  CONXIAN_GATEWAY_URL: nullableUrl,
  CONXIAN_SOCIAL_URL: nullableUrl,
});

const conxianPlugin: Plugin = {
  name: "plugin-conxian",
  description: "ElizaOS plugin for Conxian Gateway + SIDL social surfaces",
  config: {
    CONXIAN_GATEWAY_URL: process.env.CONXIAN_GATEWAY_URL ?? null,
    CONXIAN_SOCIAL_URL: process.env.CONXIAN_SOCIAL_URL ?? null,
  },

  async init(config, runtime) {
    const validated = await configSchema.parseAsync(config);
    const env = parseConxianEnv(validated);

    createConxianActions(env).forEach((a) => runtime.registerAction(a));
    logger.info("plugin-conxian initialized");
  },

  actions: [],
  providers: [],
  evaluators: [],
  services: [],
  routes: [],
  events: {},
};

export default conxianPlugin;
export { conxianPlugin };
