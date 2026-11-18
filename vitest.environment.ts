import { builtinEnvironments, type Environment } from "vitest/runtime";

// Node provides Request; keep its matching AbortSignal/Controller instead of
// mixing them with jsdom's separate realm when testing data-router navigation.
export default {
  ...builtinEnvironments.jsdom,
  name: "jsdom-native-signals",
  async setup(global, options) {
    const { AbortController, AbortSignal } = global;
    // Node can define Web Storage globals even when no storage file is configured.
    // Let Vitest install the jsdom implementations for this test worker.
    const storageKeys = ["localStorage", "sessionStorage"] as const;
    const storageDescriptors = storageKeys.map((key) =>
      Object.getOwnPropertyDescriptor(global, key),
    );
    for (const key of storageKeys) Reflect.deleteProperty(global, key);

    const restoreStorage = () => {
      for (const [index, key] of storageKeys.entries()) {
        const descriptor = storageDescriptors[index];
        if (descriptor) Object.defineProperty(global, key, descriptor);
      }
    };
    try {
      const environment = await builtinEnvironments.jsdom.setup(global, options);
      Object.assign(global, { AbortController, AbortSignal });
      return {
        async teardown() {
          try {
            await environment.teardown(global);
          } finally {
            restoreStorage();
          }
        },
      };
    } catch (error) {
      restoreStorage();
      throw error;
    }
  },
} satisfies Environment;
