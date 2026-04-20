import { useEffect, useState } from "react";
import type { Schema } from "../../../../amplify/data/resource";
import WorkRequestService from "../../../services/WorkRequestService";
import reportError from "../../../utils/reportError";

const workRequestService = WorkRequestService();

export function useWorkRequestDetails(workRequestId: string | null) {
  const [workRequest, setWorkRequest] = useState<Schema["WorkRequest"]["type"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workRequestId) {
      setWorkRequest(null);
      setLoading(false);
      return;
    }

    let aborted = false;
    let id = workRequestId;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await workRequestService.getWorkRequest(id)
        if (!data) {
            throw new Error(reportError("Error while fetching work request to be displayed: work request was not found"));
        }

        if (!aborted) setWorkRequest(data ?? null);
      } catch (err) {
        if (!aborted) setError(err as Error);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, [workRequestId]);

  return { workRequest, loading, error };
}