import { useEffect, useRef } from "react";

import type { PendingWorkoutCreatorJob } from "../../domain/workoutCreatorJob";

type Options = {
  enabled: boolean;
  job: PendingWorkoutCreatorJob | null;
  resume: (job: PendingWorkoutCreatorJob, shouldContinue: () => boolean) => Promise<void>;
  scopeKey: string;
};

export function useWorkoutCreatorJobPolling(options: Options) {
  const resumeRef = useRef(options.resume);
  resumeRef.current = options.resume;

  useEffect(() => {
    if (!options.enabled || !options.job) {
      return;
    }
    const job = options.job;
    let isActive = true;
    void resumeRef.current(job, () => isActive);
    return () => {
      isActive = false;
    };
  }, [options.enabled, options.job?.jobId, options.scopeKey]);
}
