import type { EventBridgeHandler } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const eventBridgeClient = new EventBridgeClient({});
const envName = process.env.BRANCH_NAME || 'unknown';

const NOTIFICATIONS_BUS_NAME = "sebcel-chocoop-notifications";

const logger = new Logger({
    logLevel: "INFO",
    serviceName: "sebcel-chocoop-email-notifications-function",
});

async function sendNotification(subject: string, message: string, recipient?: string): Promise<void> {
    await eventBridgeClient.send(new PutEventsCommand({
        Entries: [{
            Source: "sebcel-chocoop",
            DetailType: "SendEmail",
            Detail: JSON.stringify({ subject, message, ...(recipient ? { recipient } : {}) }),
            EventBusName: NOTIFICATIONS_BUS_NAME
        }]
    }));
}

export const handler: EventBridgeHandler<string, unknown, void> = async (event) => {
    const detail = event.detail as Record<string, string>;
    const detailType = event["detail-type"];

    logger.info("Processing event", { detailType });

    switch (detailType) {
        case "WorkRequestCreated":
            await sendNotification(
                "Nowe zlecenie",
                `${detail.createdByName} dodał(a) nowe zlecenie: "${detail.type}" (${detail.exp} pkt). Pilność: ${detail.urgencyDescription}.`
            );
            break;

        case "WorkRequestCompleted":
            await sendNotification(
                "Zlecenie wykonane",
                `${detail.completedByName} wykonał(a) zlecenie "${detail.type}" (${detail.exp} pkt).`
            );
            break;

        case "ReactionAdded":
            await sendNotification(
                "Nowa reakcja",
                `${detail.reactionUserName} dodał(a) reakcję ${detail.reaction} do czynności "${detail.activityType}" użytkownika ${detail.activityUserName}.`
            );
            break;

        case "ActivityReminderNeeded":
            await sendNotification(
                "Przypomnienie o aktywności",
                `Hej ${detail.userName}! Nie zalogowano żadnej aktywności dzisiaj (${detail.date}). Czas coś zrobić!`,
                detail.userEmail
            );
            break;

        default:
            logger.warn("Unhandled event type", { detailType });
    }
};
