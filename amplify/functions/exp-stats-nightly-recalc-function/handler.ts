import type { ScheduledHandler } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { DynamoDBClient, ScanCommand, DeleteItemCommand, PutItemCommand, AttributeValue } from "@aws-sdk/client-dynamodb";

const ssmClient = new SSMClient();
const dynamoDbClient = new DynamoDBClient({});
const envName = process.env.BRANCH_NAME || 'unknown';

const logger = new Logger({
    logLevel: "INFO",
    serviceName: "sebcel-chocoop-exp-stats-nightly-recalc-function",
});

async function getParameter(name: string): Promise<string> {
    const response = await ssmClient.send(new GetParameterCommand({ Name: name }));
    return response.Parameter?.Value || '';
}

async function deleteAllStats(expStatsTableName: string) {
    logger.info("Deleting all stats");

    let lastKey: Record<string, AttributeValue> | undefined;
    do {
        const response = await dynamoDbClient.send(new ScanCommand({
            TableName: expStatsTableName,
            ExclusiveStartKey: lastKey,
            ProjectionExpression: "id"
        }));

        await Promise.all((response.Items || []).map(item =>
            dynamoDbClient.send(new DeleteItemCommand({
                TableName: expStatsTableName,
                Key: { id: { S: item.id.S! } }
            }))
        ));

        lastKey = response.LastEvaluatedKey;
    } while (lastKey !== undefined);

    logger.info("All stats deleted");
}

async function scanAllActivities(activityTableName: string): Promise<Array<{ date: string; user: string; exp: number }>> {
    const activities: Array<{ date: string; user: string; exp: number }> = [];

    let lastKey: Record<string, AttributeValue> | undefined;
    do {
        const response = await dynamoDbClient.send(new ScanCommand({
            TableName: activityTableName,
            ExclusiveStartKey: lastKey
        }));

        for (const item of response.Items || []) {
            const date = item.date?.S;
            const user = item.user?.S;
            const exp = item.exp?.N;
            if (date && user && exp) {
                activities.push({ date, user, exp: parseInt(exp) });
            }
        }

        lastKey = response.LastEvaluatedKey;
    } while (lastKey !== undefined);

    return activities;
}

async function rebuildAllStats(expStatsTableName: string, activities: Array<{ date: string; user: string; exp: number }>) {
    logger.info("Rebuilding all stats", { activityCount: activities.length });

    const dayStats = new Map<string, Map<string, number>>();
    const monthStats = new Map<string, Map<string, number>>();
    const yearStats = new Map<string, Map<string, number>>();
    const totalStats = new Map<string, number>();

    for (const { date, user, exp } of activities) {
        const day = date.substring(0, 10);
        const month = date.substring(0, 7);
        const year = date.substring(0, 4);

        if (!dayStats.has(day)) dayStats.set(day, new Map());
        dayStats.get(day)!.set(user, (dayStats.get(day)!.get(user) || 0) + exp);

        if (!monthStats.has(month)) monthStats.set(month, new Map());
        monthStats.get(month)!.set(user, (monthStats.get(month)!.get(user) || 0) + exp);

        if (!yearStats.has(year)) yearStats.set(year, new Map());
        yearStats.get(year)!.set(user, (yearStats.get(year)!.get(user) || 0) + exp);

        totalStats.set(user, (totalStats.get(user) || 0) + exp);
    }

    const now = new Date().toISOString();
    const puts: Promise<any>[] = [];

    const putStat = (periodType: string, period: string, user: string, exp: number) => {
        const id = `${periodType}-${period}-${user}`;
        puts.push(dynamoDbClient.send(new PutItemCommand({
            TableName: expStatsTableName,
            Item: {
                id: { S: id },
                periodType: { S: periodType },
                period: { S: period },
                user: { S: user },
                exp: { N: String(exp) },
                createdAt: { S: now },
                updatedAt: { S: now }
            }
        })));
    };

    for (const [day, userMap] of dayStats) {
        for (const [user, exp] of userMap) putStat("DAY", day, user, exp);
    }
    for (const [month, userMap] of monthStats) {
        for (const [user, exp] of userMap) putStat("MONTH", month, user, exp);
    }
    for (const [year, userMap] of yearStats) {
        for (const [user, exp] of userMap) putStat("YEAR", year, user, exp);
    }
    for (const [user, exp] of totalStats) {
        putStat("TOTAL", "TOTAL", user, exp);
    }

    await Promise.all(puts);
    logger.info("All stats rebuilt");
}

export const handler: ScheduledHandler = async () => {
    const activityTableName = await getParameter(`/sebcel-chocoop-app/activity-table-name-${envName}`);
    const expStatsTableName = await getParameter(`/sebcel-chocoop-app/exp-stats-table-name-${envName}`);

    logger.info("Starting nightly stats recalculation");

    await deleteAllStats(expStatsTableName);
    const activities = await scanAllActivities(activityTableName);
    await rebuildAllStats(expStatsTableName, activities);

    logger.info("Nightly stats recalculation complete");
};
