import { builtinEnvironments, type Environment } from "vitest/environments";

// Node provides Request; keep its matching AbortSignal/Controller instead of
// mixing them with jsdom's separate realm when testing data-router navigation.
export default {
  ...builtinEnvironments.jsdom,
  name: "jsdom-native-signals",
  async setup(global, options) {
    const { AbortController, AbortSignal } = global;
    const environment = await builtinEnvironments.jsdom.setup(global, options);
    Object.assign(global, { AbortController, AbortSignal });
    return environment;
  },
} satisfies Environment;
