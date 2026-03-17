import {
  defaultShouldDehydrateQuery,
  QueryClient,
  type QueryClientConfig,
} from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient(config: QueryClientConfig = {}) {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config.defaultOptions,
      queries: {
        staleTime: 60 * 1000,
        ...config.defaultOptions?.queries,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        ...config.defaultOptions?.dehydrate,
      },
      hydrate: {
        deserializeData: superjson.deserialize,
        ...config.defaultOptions?.hydrate,
      },
      mutations: {
        ...config.defaultOptions?.mutations,
      },
    },
  });
}
