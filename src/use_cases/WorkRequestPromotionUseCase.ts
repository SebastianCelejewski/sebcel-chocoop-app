import { ActivityFormState} from "../model/ActivityFormState";
import { WorkRequestFormState} from "../model/WorkRequestFormState";
import { OperationResult } from "../model/OperationResult";
import ActivityService from "../services/ActivityService"
import WorkRequestService from "../services/WorkRequestService"

export default function WorkRequestPromotionUseCase() {

    const activityService = ActivityService();
    const workRequestService = WorkRequestService();

    async function promoteWorkRequest(activity: ActivityFormState, workRequest: WorkRequestFormState): Promise<OperationResult> {
        activity.requestedAs = workRequest.id;
        activity.source = "promotion";
        var activityCreationResult = await activityService.createActivity(activity);
        if (activityCreationResult.success) {
            workRequest.completed = true;
            workRequest.completedAs = activityCreationResult.data;
        }
        var workRequestUpdateResult = await workRequestService.updateWorkRequest(workRequest);
        if (workRequestUpdateResult.success) {
            return activityCreationResult;
        }

        return workRequestUpdateResult;
    }

    return {
        promoteWorkRequest
    }
}