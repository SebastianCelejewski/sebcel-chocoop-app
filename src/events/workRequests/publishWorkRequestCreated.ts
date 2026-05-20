import { EventPublisher } from "../EventPublisher";

interface PublishWorkRequestCreatedParams {
    workRequestId: string;
    createdBy: string;
    createdDate: string;
    type: string;
    exp: number;
    urgency: string;
}

export async function publishWorkRequestCreated(params: PublishWorkRequestCreatedParams): Promise<void> {

    await EventPublisher.publish(
        "WorkRequestCreated",
        {
            workRequestId: params.workRequestId,
            createdBy: params.createdBy,
            createdDate: params.createdDate,
            type: params.type,
            exp: params.exp,
            urgency: params.urgency
        }
    );
}