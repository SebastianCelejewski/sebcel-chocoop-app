import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { fetchAuthSession } from "aws-amplify/auth";

const EVENT_BUS_NAME = import.meta.env.VITE_EVENT_BUS_NAME;
const AWS_REGION = import.meta.env.VITE_AWS_REGION;
const EVENT_SOURCE = "sebcel-chocoop";

export class EventPublisher {

    static async publish(detailType: string, detail: unknown): Promise<void> {

        const session = await fetchAuthSession();

        if (!session.credentials) {
            throw new Error("AWS credentials are missing");
        }

        const client = new EventBridgeClient({
            region: AWS_REGION,
            credentials: session.credentials
        });
        
        const command = new PutEventsCommand({
            Entries: [
                {
                    Source: EVENT_SOURCE,
                    DetailType: detailType,
                    Detail: JSON.stringify(detail),
                    EventBusName: EVENT_BUS_NAME
                }
            ]
        });

        const response = await client.send(command);

        if (response.FailedEntryCount && response.FailedEntryCount > 0) {
            console.error("Failed to publish event",response.Entries);
            throw new Error("EventBridge publish failed");
        }
    }
}