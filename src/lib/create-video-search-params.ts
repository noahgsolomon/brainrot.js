export type RawSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type CreateVideoSearchParams = {
  error?: string;
  loggedIn?: string;
  subscribed?: string;
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
