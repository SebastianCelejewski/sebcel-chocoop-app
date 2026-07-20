import type { DynamoDBStreamHandler } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const dynamoDbClient = new DynamoDBClient({});
const cognitoClient = new CognitoIdentityProviderClient({});
const eventBridgeClient = new EventBridgeClient({});
const ssmClient = new SSMClient();
const envName = process.env.BRANCH_NAME || 'unknown';

const EVENT_BUS_NAME = `sebcel-chocoop-infra-bus-${envName}`;
const EVENT_SOURCE = "sebcel-chocoop";

const logger = new Logger({
    logLevel: "INFO",
    serviceName: "sebcel-chocoop-domain-events-function",
});

const URGENCY_LABELS: Record<number, string> = {
    0: "Nieokreślona",
    1: "Jak najszybciej",
    2: "W ciągu paru godzin",
    3: "W ciągu paru dni",
    4: "W ciągu paru tygodni",
    5: "W ciągu paru miesięcy",
    6: "Bez konkretnego terminu",
};

function urgencyDescription(raw: string | undefined): string {
    const level = parseInt(raw ?? "", 10);
    return URGENCY_LABELS[level] ?? raw ?? "";
}

let activityTableNameCache: string | null = null;
let userPoolIdCache: string | null = null;
const userNicknameCache = new Map<string, string>();

async function getSSMParameter(name: string): Promise<string> {
    const response = await ssmClient.send(new GetParameterCommand({ Name: name }));
    const value = response.Parameter?.Value;
    if (!value) throw new Error(`SSM parameter '${name}' is missing or empty`);
    return value;
}

async function getActivityTableName(): Promise<string> {
    if (activityTableNameCache) return activityTableNameCache;
    activityTableNameCache = await getSSMParameter(`/sebcel-chocoop-app/activity-table-name-${envName}`);
    return activityTableNameCache;
}

async function getUserPoolId(): Promise<string> {
    if (userPoolIdCache) return userPoolIdCache;
    userPoolIdCache = await getSSMParameter(`/sebcel-chocoop-app/user-pool-id-${envName}`);
    return userPoolIdCache;
}

async function getNickname(userId: string): Promise<string> {
    if (userNicknameCache.has(userId)) return userNicknameCache.get(userId)!;
    try {
        const userPoolId = await getUserPoolId();
        const response = await cognitoClient.send(new ListUsersCommand({
            UserPoolId: userPoolId,
            Filter: `sub = "${userId}"`,
            Limit: 1
        }));
        const nickname = response.Users?.[0]?.Attributes?.find(a => a.Name === "nickname")?.Value || userId;
        userNicknameCache.set(userId, nickname);
        return nickname;
    } catch {
        return userId;
    }
}

async function publishEvent(detailType: string, detail: unknown): Promise<void> {
    const response = await eventBridgeClient.send(new PutEventsCommand({
        Entries: [{
            Source: EVENT_SOURCE,
            DetailType: detailType,
            Detail: JSON.stringify(detail),
            EventBusName: EVENT_BUS_NAME
        }]
    }));
    if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const failed = response.Entries?.filter(e => e.ErrorCode);
        throw new Error(`EventBridge rejected entry: ${JSON.stringify(failed)}`);
    }
    logger.info("Published event", { detailType, detail });
}

async function fetchActivity(activityId: string): Promise<Record<string, string> | null> {
    const tableName = await getActivityTableName();
    const response = await dynamoDbClient.send(new GetItemCommand({
        TableName: tableName,
        Key: { id: { S: activityId } }
    }));
    if (!response.Item) return null;
    return {
        id: response.Item.id?.S || '',
        type: response.Item.type?.S || '',
        user: response.Item.user?.S || '',
        date: response.Item.date?.S || ''
    };
}

export const handler: DynamoDBStreamHandler = async (event) => {
    const batchItemFailures: { itemIdentifier: string }[] = [];

    for (const record of event.Records) {
        const eventName = record.eventName;
        const newImg = record.dynamodb?.NewImage;
        const oldImg = record.dynamodb?.OldImage;

        try {
            // WorkRequest events
            if (record.eventSourceARN?.includes("WorkRequest")) {
                if (eventName === "INSERT" && newImg) {
                    const createdBy = newImg.createdBy?.S || '';
                    const urgencyRaw = newImg.urgency?.N;
                    await publishEvent("WorkRequestCreated", {
                        workRequestId: newImg.id?.S,
                        createdBy,
                        createdByName: await getNickname(createdBy),
                        createdDate: newImg.createdDate?.S,
                        type: newImg.type?.S,
                        exp: newImg.exp?.N,
                        urgency: urgencyRaw !== undefined ? parseInt(urgencyRaw, 10) : undefined,
                        urgencyDescription: urgencyDescription(urgencyRaw),
                    });
                }
                continue;
            }

            // Activity events
            if (record.eventSourceARN?.includes("Activity") && !record.eventSourceARN?.includes("ExperienceStatistics")) {
                if (eventName === "INSERT" && newImg) {
                    const source = newImg.source?.S;
                    const userId = newImg.user?.S || '';
                    if (source === "promotion") {
                        await publishEvent("WorkRequestCompleted", {
                            activityId: newImg.id?.S,
                            workRequestId: newImg.requestedAs?.S,
                            completedBy: userId,
                            completedByName: await getNickname(userId),
                            type: newImg.type?.S,
                            exp: newImg.exp?.N,
                            date: newImg.date?.S
                        });
                    } else {
                        await publishEvent("ActivityCreated", {
                            activityId: newImg.id?.S,
                            createdBy: userId,
                            createdByName: await getNickname(userId),
                            type: newImg.type?.S,
                            exp: newImg.exp?.N,
                            date: newImg.date?.S
                        });
                    }
                }
                continue;
            }

            // Reaction events
            if (record.eventSourceARN?.includes("Reaction")) {
                if (eventName === "INSERT" && newImg) {
                    const activityId = newImg.activityId?.S;
                    const reactionUserId = newImg.user?.S || '';
                    const activity = activityId ? await fetchActivity(activityId) : null;
                    const [reactionUserName, activityUserName] = await Promise.all([
                        getNickname(reactionUserId),
                        activity?.user ? getNickname(activity.user) : Promise.resolve('')
                    ]);
                    await publishEvent("ReactionAdded", {
                        reactionId: newImg.id?.S,
                        activityId,
                        activityType: activity?.type,
                        activityUser: activity?.user,
                        activityUserName,
                        reactionUser: reactionUserId,
                        reactionUserName,
                        reaction: newImg.reaction?.S
                    });
                }
                continue;
            }

        } catch (error) {
            logger.error("Failed to process stream record", { error, record });
            if (record.dynamodb?.SequenceNumber) {
                batchItemFailures.push({ itemIdentifier: record.dynamodb.SequenceNumber });
            }
        }
    }

    return { batchItemFailures };
};
