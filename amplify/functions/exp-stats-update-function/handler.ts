import type { DynamoDBStreamHandler } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { DynamoDBClient, ScanCommand, DeleteItemCommand, PutItemCommand, PutItemCommandInput, PutItemCommandOutput, AttributeValue } from "@aws-sdk/client-dynamodb";

const ssmClient = new SSMClient();
const dynamoDbClient = new DynamoDBClient({});
const envName = process.env.BRANCH_NAME || 'unknown';

const logger = new Logger({
    logLevel: "INFO",
    serviceName: "sebcel-chocoop-exp-stats-update-function",
});

async function getParameter(parameterPath: string): Promise<string> {
    const command = new GetParameterCommand({ Name: parameterPath });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value || '';
}

async function putData(tableName: string, periodType: string, period: string, user: string, exp: number) {
    const partitionKey = `${periodType}-${period}-${user}`;

    var putItemParams: PutItemCommandInput = {
        TableName: tableName,
        Item: {
            "id": { S: partitionKey },
            "periodType": { S: periodType },
            "period": { S: period },
            "user": { S: user as string },
            "exp": { N: String(exp) },
            "createdAt": { S: new Date().toISOString() },
            "updatedAt": { S: new Date().toISOString() }
        },
        ReturnConsumedCapacity: "TOTAL",
    };

    const putItemRequest = new PutItemCommand(putItemParams);
    await dynamoDbClient.send(putItemRequest);
}

const clearStatistics = async () => {
    console.log("Clearing the experience statistics table")
    const expStatsTableName = await getParameter(`/sebcel-chocoop-app/exp-stats-table-name-${envName}`);

    const params = {
        TableName: expStatsTableName,
        ExclusiveStartKey: undefined as any
    };

    const request = new ScanCommand(params);
    const response = await dynamoDbClient.send(request);
    response.Items?.forEach((item: Record<string, AttributeValue>) => {
        const id = item["id"]["S"];
        if (id) {
            const deleteParams = {
                TableName: expStatsTableName,
                Key: {
                    "id": { S: id }
                }
            };
            const deleteRequest = new DeleteItemCommand(deleteParams);
            dynamoDbClient.send(deleteRequest)
        }
    });

    console.log("The experience statistics table is cleared")
}

const rebuildStatistics = async () => {
    console.log("Rebuilding the experience statistics table")
    const activityTableName = await getParameter(`/sebcel-chocoop-app/activity-table-name-${envName}`,);
    const expStatsTableName = await getParameter(`/sebcel-chocoop-app/exp-stats-table-name-${envName}`);

    const params = {
        TableName: activityTableName,
        ExclusiveStartKey: undefined as any
    };

    var userNames = new Set<string>();
    var dailyData = new Map<string, Map<string, number>>();
    var monthlyData = new Map<string, Map<string, number>>();
    var annualData = new Map<string, Map<string, number>>();
    var totalData = new Map<string, number>();

    console.log("Starting processing of the activities data")

    let response;
    do {
        const request = new ScanCommand(params);
        response = await dynamoDbClient.send(request);
        console.log("Received " + response.Items?.length + " items from the database")
        response.Items?.forEach((item: Record<string, AttributeValue>) => {
            const date = item["date"]["S"];
            const user = item["user"]["S"];
            const exp = item["exp"]["N"];
            
            if (date === undefined || user === undefined || exp === undefined) {
                console.log("Invalid data fetched from the database. Check date, user and exp");
                return
            }

            const day = date.substring(0,10);
            const month = date.substring(0, 7);
            const year = date.substring(0, 4);

            if (!(dailyData.has(day))) {
                dailyData.set(day, new Map<string, number>());
            } 
            const dailyMap = dailyData.get(day) || new Map<string, number>();
            if (!(dailyMap.has(user))) {
                dailyMap.set(user, 0);
            }
            
            if (!(monthlyData.has(month))) {
                monthlyData.set(month, new Map());
            } 
            const monthlyMap = monthlyData.get(month) || new Map<string, number>();
            if (!(monthlyMap.has(user))) {
                monthlyMap.set(user, 0);
            }
            
            if (!(annualData.has(year))) {
                annualData.set(year, new Map());
            } 
            const annualMap = annualData.get(year) || new Map<string, number>();
            if (!(annualMap.has(user))) {
                annualMap.set(user, 0);
            }

            if (!(totalData.has(user))) {
                totalData.set(user, 0);
            }

            dailyMap.set(user, (dailyMap.get(user) || 0) + parseInt(exp || "0"));
            dailyData.set(day, dailyMap);

            monthlyMap.set(user, (monthlyMap.get(user) || 0) + parseInt(exp || "0"));
            monthlyData.set(month, monthlyMap);

            annualMap.set(user, (annualMap.get(user) || 0) + parseInt(exp || "0"));
            annualData.set(year, annualMap);

            totalData.set(user, (totalData.get(user) || 0) + parseInt(exp || "0"));

            userNames.add(user);
        });
        params.ExclusiveStartKey = response.LastEvaluatedKey;
    } while (typeof response.LastEvaluatedKey !== "undefined");
    
    console.log("Processing of the activities data completed")

    for (const [day, value] of dailyData) {
        for (const user of userNames) {
            if (value.has(user)) {
                const exp = value.get(user as string) || 0;
                await putData(expStatsTableName, "DAY", day, user, exp);
            } 
        }
    }

    for (const [month, value] of monthlyData) {
        for (const user of userNames) {
            if (value.has(user)) {
                const exp = value.get(user as string) || 0
                await putData(expStatsTableName, "MONTH", month, user, exp);
            } 
        }
    }

    for (const [year, value] of annualData) {
        for (const user of userNames) {
            if (value.has(user)) {
                const exp = value.get(user as string) || 0
                await putData(expStatsTableName, "YEAR", year, user, exp);
            } 
        }
    }    

    for (const user of userNames) {
        if (totalData.has(user)) {
            const exp = totalData.get(user as string) || 0
            await putData(expStatsTableName, "TOTAL", "TOTAL", user, exp);
        } 
    }
    
    console.log("The experience statistics table is rebuilt")
}

export const handler: DynamoDBStreamHandler = async (event) => {
    await clearStatistics()
    await rebuildStatistics()

    return {
        batchItemFailures: []
    };
};