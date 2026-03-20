import { serializeSpeakerNamesForQueryParam } from "@/lib/brainrot-speakers";

export type RawSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type CreateVideoSearchParams = {
  error?: string;
  loggedIn?: string;
  subscribed?: string;
  agents?: string;
  agent1Id?: string;
  agent2Id?: string;
  agent1Name?: string;
  agent2Name?: string;
  title?: string;
  credits?: string;
  music?: string;
  background?: string;
  assetType?: string;
  duration?: string;
  fps?: string;
};

export function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeCreateVideoSearchParams(
  searchParams: RawSearchParams,
): CreateVideoSearchParams {
  return {
    error: getSingleSearchParam(searchParams.error),
    loggedIn: getSingleSearchParam(searchParams.loggedIn),
    subscribed: getSingleSearchParam(searchParams.subscribed),
    agents: getSingleSearchParam(searchParams.agents),
    agent1Id: getSingleSearchParam(searchParams.agent1Id),
    agent2Id: getSingleSearchParam(searchParams.agent2Id),
    agent1Name: getSingleSearchParam(searchParams.agent1Name),
    agent2Name: getSingleSearchParam(searchParams.agent2Name),
    title: getSingleSearchParam(searchParams.title),
    credits: getSingleSearchParam(searchParams.credits),
    music: getSingleSearchParam(searchParams.music),
    background: getSingleSearchParam(searchParams.background),
    assetType: getSingleSearchParam(searchParams.assetType),
    duration: getSingleSearchParam(searchParams.duration),
    fps: getSingleSearchParam(searchParams.fps),
  };
}

export function buildCreateVideoSearchQuery(
  searchParams: Omit<CreateVideoSearchParams, "agents"> & {
    agents?: Array<string | null | undefined> | string;
  },
) {
  const params = new URLSearchParams();

  const entries = {
    error: searchParams.error,
    loggedIn: searchParams.loggedIn,
    subscribed: searchParams.subscribed,
    agents:
      typeof searchParams.agents === "string"
        ? searchParams.agents
        : serializeSpeakerNamesForQueryParam(searchParams.agents ?? []),
    agent1Id: searchParams.agent1Id,
    agent2Id: searchParams.agent2Id,
    agent1Name: searchParams.agent1Name,
    agent2Name: searchParams.agent2Name,
    title: searchParams.title,
    credits: searchParams.credits,
    music: searchParams.music,
    background: searchParams.background,
    assetType: searchParams.assetType,
    duration: searchParams.duration,
    fps: searchParams.fps,
  } satisfies Record<string, string | undefined>;

  for (const [key, value] of Object.entries(entries)) {
    if (!value) {
      continue;
    }

    params.set(key, value);
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}
