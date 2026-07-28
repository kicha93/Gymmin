import { describe, expect, it, vi } from "vitest";

import {
  createWorkoutCreatorApiClient,
  getWorkoutCreatorJobId,
  isWorkoutCreatorJobResponse,
  normalizeWorkoutCreatorJobStatus
} from "../../api/workoutCreatorApi";

function createClient(response: Response) {
  const request = vi.fn(async () => response);
  const createError = vi.fn(async (failedResponse: Response) => {
    const error = new Error("request failed") as Error & { status?: number };
    error.status = failedResponse.status;
    return error;
  });
  return { client: createWorkoutCreatorApiClient({ createError, request }), createError, request };
}

describe("workoutCreatorApi", () => {
  it("recognizes queued job responses", () => {
    const value = { jobId: "job-a", status: "queued" };
    expect(isWorkoutCreatorJobResponse(value)).toBe(true);
    expect(getWorkoutCreatorJobId(value)).toBe("job-a");
  });

  it("extracts nested completed job data", () => {
    expect(normalizeWorkoutCreatorJobStatus({
      result: { response: { data: { workouts: [{ name: "Plan" }] } } },
      status: "completed"
    })).toMatchObject({
      result: { workouts: [{ name: "Plan" }] },
      status: "completed"
    });
  });

  it("normalizes failed job details", () => {
    expect(normalizeWorkoutCreatorJobStatus({ detail: "Generation failed", status: "failed" }))
      .toEqual({ error: "Generation failed", result: null, status: "failed" });
  });

  it("encodes job ids in polling paths", async () => {
    const { client, request } = createClient(new Response(JSON.stringify({ status: "processing" }), { status: 200 }));
    await client.getJob("job/a", {}, "failed");
    expect(request).toHaveBeenCalledWith("/api/workout-creator/plan/job%2Fa", { headers: {} });
  });

  it("routes insufficient-credit responses through the shared error factory", async () => {
    const { client, createError } = createClient(new Response("{}", { status: 402 }));
    await expect(client.startPlan({
      language: "pl",
      profileId: null,
      questionsAndAnswers: [],
      sensitiveDataConsent: true
    }, {}, "failed"))
      .rejects.toMatchObject({ status: 402 });
    expect(createError).toHaveBeenCalled();
  });

  it("sends explicit sensitive-data consent with the plan request", async () => {
    const { client, request } = createClient(new Response(JSON.stringify({ jobId: "job-a" }), { status: 202 }));
    await client.startPlan({
      language: "en",
      profileId: "profile-a",
      questionsAndAnswers: [{ Answer: "Knee pain", Question: "Injuries" }],
      sensitiveDataConsent: true
    }, {}, "failed");

    const [, init] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init?.body))).toMatchObject({ sensitiveDataConsent: true });
  });
});
