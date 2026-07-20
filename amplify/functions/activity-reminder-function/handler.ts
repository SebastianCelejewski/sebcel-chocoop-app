import type { ScheduledHandler } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient, ScanCommand, AttributeValue } from "@aws-sdk/client-dynamodb";
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
    serviceName: "sebcel-chocoop-activity-reminder-function",
});

async function getSSMParameter(name: string): Promise<string> {
    const response = await ssmClient.send(new GetParameterCommand({ Name: name }));
    const value = response.Parameter?.Value;
    if (!value) throw new Error(`SSM parameter '${name}' is missing or empty`);
    return value;
}

async function getActivityTableName(): Promise<string> {
    return getSSMParameter(`/sebcel-chocoop-app/activity-table-name-${envName}`);
}

async function getUserPoolId(): Promise<string> {
    const paramName = process.env.USER_POOL_ID_PARAM;
    if (!paramName) throw new Error("USER_POOL_ID_PARAM environment variable is not set");
    return getSSMParameter(paramName);
}

function getTodayInPoland(): string {
    // Poland is UTC+1 (CET) or UTC+2 (CEST). toLocaleDateString with the
    // Europe/Warsaw timezone gives the correct local date regardless of DST.
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
}

async function getUsersWithActivitiesToday(activityTableName: string, today: string): Promise<Set<string>> {
    const usersWithActivities = new Set<string>();
    let lastKey: Record<string, AttributeValue> | undefined;

    do {
        const response = await dynamoDbClient.send(new ScanCommand({
            TableName: activityTableName,
            ExclusiveStartKey: lastKey,
            FilterExpression: "#date = :today",
            ExpressionAttributeNames: { "#date": "date" },
            ExpressionAttributeValues: { ":today": { S: today } }
        }));

        for (const item of response.Items || []) {
            const user = item.user?.S;
            if (user) usersWithActivities.add(user);
        }

        lastKey = response.LastEvaluatedKey;
    } while (lastKey !== undefined);

    return usersWithActivities;
}

interface CognitoUser {
    sub: string;
    email: string;
    nickname: string;
}

async function getAllUsers(userPoolId: string): Promise<CognitoUser[]> {
    const users: CognitoUser[] = [];
    let paginationToken: string | undefined;

    do {
        const response = await cognitoClient.send(new ListUsersCommand({
            UserPoolId: userPoolId,
            PaginationToken: paginationToken
        }));

        for (const user of response.Users || []) {
            const attr = (name: string) => user.Attributes?.find(a => a.Name === name)?.Value || '';
            const sub = attr("sub");
            if (sub) users.push({ sub, email: attr("email"), nickname: attr("nickname") });
        }

        paginationToken = response.PaginationToken;
    } while (paginationToken !== undefined);

    return users;
}

async function publishReminder(user: CognitoUser, date: string): Promise<void> {
    const response = await eventBridgeClient.send(new PutEventsCommand({
        Entries: [{
            Source: EVENT_SOURCE,
            DetailType: "ActivityReminderNeeded",
            Detail: JSON.stringify({ userId: user.sub, userEmail: user.email, userName: user.nickname, date }),
            EventBusName: EVENT_BUS_NAME
        }]
    }));
    if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const failed = response.Entries?.filter(e => e.ErrorCode);
        throw new Error(`EventBridge rejected ActivityReminderNeeded event for user ${user.sub}: ${JSON.stringify(failed)}`);
    }
}

export const handler: ScheduledHandler = async () => {
    const activityTableName = await getActivityTableName();
    const today = getTodayInPoland();

    logger.info("Running activity reminder check", { today });

    const [userPoolId, usersWithActivities] = await Promise.all([
        getUserPoolId(),
        getUsersWithActivitiesToday(activityTableName, today),
    ]);

    const allUsers = await getAllUsers(userPoolId);
    const usersWithoutActivities = allUsers.filter(u => !usersWithActivities.has(u.sub));

    logger.info("Reminder check complete", {
        total: allUsers.length,
        withActivities: usersWithActivities.size,
        withoutActivities: usersWithoutActivities.length
    });

    const results = await Promise.allSettled(usersWithoutActivities.map(user => publishReminder(user, today)));
    const failures = results.filter(r => r.status === "rejected");
    if (failures.length > 0) {
        logger.error("Some reminders failed to publish", { failures });
    }
};
