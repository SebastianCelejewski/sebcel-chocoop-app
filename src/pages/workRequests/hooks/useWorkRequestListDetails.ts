import { useEffect, useState } from "react";
import type { Schema } from "../../../../amplify/data/resource";
import WorkRequestService from "../../../services/WorkRequestService";

const workRequestService = WorkRequestService();

export function useWorkRequestListDetails() {

    const [workRequests, setWorkRequests] = useState<Array<Schema["WorkRequest"]["type"]>>([]);

    useEffect(() => {
        workRequestService.observeWorkRequests((items) => {
            setWorkRequests(sortByUrgency([...items]));
        });
    }, []);

    return { workRequests };
}

function sortByUrgency(workRequests: Array<Schema["WorkRequest"]["type"]>) {
    return workRequests.sort((a, b) => a.urgency - b.urgency);
}