import type { DynamoDBStreamHandler } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const ssmClient = new SSMClient();
const dynamoDbClient = new DynamoDBClient({});
const envName = process.env.BRANCH_NAME || 'unknown';

const logger = new Logger({
    logLevel: "INFO",
    serviceName: "sebcel-chocoop-exp-stats-update-function",
});

let expStatsTableNameCache: string | null = null;

async function getExpStatsTableName(): Promise<string> {
    if (expStatsTableNameCache) return expStatsTableNameCache;
    const response = await ssmClient.send(new GetParameterCommand({
        Name: `/sebcel-chocoop-app/exp-stats-table-name-${envName}`
    }));
    expStatsTableNameCache = response.Parameter?.Value || '';
    return expStatsTableNameCache;
}

async function adjustStat(tableName: string, periodType: string, period: string, user: string, delta: number) {
    const id = `${periodType}-${period}-${user}`;
    await dynamoDbClient.send(new UpdateItemCommand({
        TableName: tableName,
        Key: { id: { S: id } },
        UpdateExpression: "ADD #exp :delta SET #periodType = if_not_exists(#periodType, :periodType), #period = if_not_exists(#period, :period), #user = if_not_exists(#user, :user), createdAt = if_not_exists(createdAt, :now), updatedAt = :now",
        ExpressionAttributeNames: {
            "#exp": "exp",
            "#periodType": "periodType",
            "#period": "period",
            "#user": "user"
        },
        ExpressionAttributeValues: {
            ":delta": { N: String(delta) },
            ":periodType": { S: periodType },
            ":period": { S: period },
            ":user": { S: user },
            ":now": { S: new Date().toISOString() }
        }
    }));
}

async function applyDelta(tableName: string, date: string, user: string, expDelta: number) {
    const day = date.substring(0, 10);
    const month = date.substring(0, 7);
    const year = date.substring(0, 4);
    await Promise.all([
        adjustStat(tableName, "DAY", day, user, expDelta),
        adjustStat(tableName, "MONTH", month, user, expDelta),
        adjustStat(tableName, "YEAR", year, user, expDelta),
        adjustStat(tableName, "TOTAL", "TOTAL", user, expDelta),
    ]);
}

export const handler: DynamoDBStreamHandler = async (event) => {
    const tableName = await getExpStatsTableName();

    for (const record of event.Records) {
        const eventName = record.eventName;

        if (eventName === "INSERT") {
            const img = record.dynamodb?.NewImage;
            const date = img?.date?.S;
            const user = img?.user?.S;
            const exp = img?.exp?.N;
            if (!date || !user || !exp) {
                logger.warn("INSERT record missing required fields", { record });
                continue;
            }
            await applyDelta(tableName, date, user, parseInt(exp));

        } else if (eventName === "REMOVE") {
            const img = record.dynamodb?.OldImage;
            const date = img?.date?.S;
            const user = img?.user?.S;
            const exp = img?.exp?.N;
            if (!date || !user || !exp) {
                logger.warn("REMOVE record missing required fields", { record });
                continue;
            }
            await applyDelta(tableName, date, user, -parseInt(exp));

        } else if (eventName === "MODIFY") {
            const oldImg = record.dynamodb?.OldImage;
            const newImg = record.dynamodb?.NewImage;
            const oldDate = oldImg?.date?.S;
            const oldUser = oldImg?.user?.S;
            const oldExp = oldImg?.exp?.N;
            const newDate = newImg?.date?.S;
            const newUser = newImg?.user?.S;
            const newExp = newImg?.exp?.N;
            if (!oldDate || !oldUser || !oldExp || !newDate || !newUser || !newExp) {
                logger.warn("MODIFY record missing required fields", { record });
                continue;
            }
            if (oldExp !== newExp || oldDate !== newDate || oldUser !== newUser) {
                await applyDelta(tableName, oldDate, oldUser, -parseInt(oldExp));
                await applyDelta(tableName, newDate, newUser, parseInt(newExp));
            }
        }
    }

    return { batchItemFailures: [] };
};
