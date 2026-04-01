import type { Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { z } from "zod";
import { conxianActions } from "./actions";
import { parseConxianEnv } from "./conxianClient";

const configSchema = z.object({
  CONXIAN_GATEWAY_URL: z.string().url().optional(),
  CONXIAN_SOCIAL_URL: z.string().url().optional(),
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

    process.env.CONXIAN_GATEWAY_URL = env.CONXIAN_GATEWAY_URL;
    process.env.CONXIAN_SOCIAL_URL = env.CONXIAN_SOCIAL_URL;

    conxianActions.forEach((a) => runtime.registerAction(a));
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
