import { createAccountDataApiClient } from "./accountDataApi";
import { createAiCreditsApiClient } from "./aiCreditsApi";
import { createApiError, requestApi } from "./apiClient";
import { createAuthApiClient } from "./authApi";
import { createBugReportsApiClient } from "./bugReportsApi";
import { createProfileApiClient } from "./profileApi";
import { createWorkoutCreatorApiClient } from "./workoutCreatorApi";

type RequestApi = (endpoint: string, init?: RequestInit) => Promise<Response>;

export function createMobileApiClients(params: {
  apiBaseUrl: string;
  rateLimitMessage: string;
  request?: RequestApi;
}) {
  const request = params.request
    ?? ((endpoint: string, init?: RequestInit) => requestApi(params.apiBaseUrl, endpoint, init));
  const dependencies = {
    createError: (response: Response, endpoint: string, method: string, fallbackMessage: string) =>
      createApiError(response, endpoint, method, fallbackMessage, params.rateLimitMessage),
    request
  };

  return {
    accountDataApi: createAccountDataApiClient(dependencies),
    aiCreditsApi: createAiCreditsApiClient(dependencies),
    authApi: createAuthApiClient(dependencies),
    bugReportsApi: createBugReportsApiClient(dependencies),
    profileApi: createProfileApiClient(dependencies),
    workoutCreatorApi: createWorkoutCreatorApiClient(dependencies)
  };
}
