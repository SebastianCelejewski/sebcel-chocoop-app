import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

type Environment = "dev" | "uat" | "prod";
const REGION = "eu-central-1";
const TARGET_ENV: Environment = "uat";
const TABLES = {
    source: {
        activity: "2026-06-04_Restore_Activity",
        workRequest: "2026-06-04_Restore_WorkRequest",
        experienceStatistics: "2026-06-04_Restore_ExperienceStatistics",
        reaction: "2026-06-04_Restore_Reaction"
    },
    target: {
        dev: {
            activity: "Activity-kgifojnrkba5zouflhpgynmdxi-NONE",
            workRequest: "WorkRequest-kgifojnrkba5zouflhpgynmdxi-NONE",
            experienceStatistics: "ExperienceStatistics-kgifojnrkba5zouflhpgynmdxi-NONE",
            reaction:  "Reaction-kgifojnrkba5zouflhpgynmdxi-NONE"
        },
        uat: {
            activity: "Activity-iy64vvika5g77o4rr6nah566p4-NONE",
            workRequest: "WorkRequest-iy64vvika5g77o4rr6nah566p4-NONE",
            experienceStatistics: "ExperienceStatistics-iy64vvika5g77o4rr6nah566p4-NONE",
            reaction: "Reaction-iy64vvika5g77o4rr6nah566p4-NONE"
        },
        prod: {
            activity: "Activity-fgrk54oigbekfjpecf2d5uvfai-NONE",
            workRequest: "WorkRequest-fgrk54oigbekfjpecf2d5uvfai-NONE",
            experienceStatistics: "ExperienceStatistics-fgrk54oigbekfjpecf2d5uvfai-NONE",
            reaction: "Reaction-fgrk54oigbekfjpecf2d5uvfai-NONE"
        }
    }
};

/*
 * ============================================================
 * USER MAPPINGS
 * ============================================================
 */

const USER_MAPPINGS: Record<Environment, Record<string, string>> = {
    dev: {
        // Sebastian
        "93546812-f081-70ba-5275-53f301512139":  "03247812-a001-70bd-a6b5-de083bcc5dd8"
        // Add more users after migration
    },
    uat: {
        // Sebastian
        "93546812-f081-70ba-5275-53f301512139": "932408c2-3081-70b8-eb7b-01054dc77c0c"
        // Add more users after migration
    },
    prod: {
        // Fill after production user migration
    }
};

const USER_MAPPING = USER_MAPPINGS[TARGET_ENV];

/*
 * ============================================================
 * AWS CLIENT
 * ============================================================
 */

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({region: REGION}));

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function rewriteUser(userId: string | undefined): string | undefined {

    if (!userId) {
        return userId;
    }

    const mappedUserId = USER_MAPPING[userId];

    if (!mappedUserId) {
        console.warn(`WARNING: No mapping found for user ${userId}`);
        return userId;
    }

    return mappedUserId;
}

async function scanAll(tableName: string): Promise<any[]> {

    const items: any[] = [];

    let exclusiveStartKey: Record<string, any> | undefined;

    while (true) {

        const response = await dynamo.send(
            new ScanCommand({TableName: tableName, ExclusiveStartKey: exclusiveStartKey})
        );

        items.push(...(response.Items ?? []));

        if (!response.LastEvaluatedKey) {
            break;
        }

        exclusiveStartKey = response.LastEvaluatedKey;
    }

    return items;
}

async function putAll(tableName: string,items: any[]) {
    for (const item of items) {
        await dynamo.send(new PutCommand({TableName: tableName, Item: item}));
    }
}

/*
 * ============================================================
 * MIGRATORS
 * ============================================================
 */

async function migrateActivities() {
    console.log("Migrating Activity table...");
    const items = await scanAll(TABLES.source.activity);
    const migratedItems = items.map(item => ({...item, user: rewriteUser(item.user) }));
    await putAll(TABLES.target[TARGET_ENV].activity, migratedItems);
    console.log(`Migrated ${migratedItems.length} activities`);
}

async function migrateWorkRequests() {
    console.log("Migrating WorkRequest table...");
    const items = await scanAll(TABLES.source.workRequest);
    const migratedItems = items.map(item => ({...item, createdBy: rewriteUser(item.createdBy)}));
    await putAll(TABLES.target[TARGET_ENV].workRequest, migratedItems);
    console.log(`Migrated ${migratedItems.length} work requests`);
}

async function migrateExperienceStatistics() {
    console.log("Migrating ExperienceStatistics table...");
    const items = await scanAll(TABLES.source.experienceStatistics);
    const migratedItems = items.map(item => ({...item, user: rewriteUser(item.user) }));
    await putAll(TABLES.target[TARGET_ENV].experienceStatistics, migratedItems);
    console.log(`Migrated ${migratedItems.length} experience statistics`);
}

async function migrateReactions() {
    console.log("Migrating Reaction table...");
    const items = await scanAll(TABLES.source.reaction);
    const migratedItems = items.map(item => ({...item, user: rewriteUser(item.user)}));
    await putAll(TABLES.target[TARGET_ENV].reaction, migratedItems);
    console.log(`Migrated ${migratedItems.length} reactions`);
}

/*
 * ============================================================
 * MAIN
 * ============================================================
 */

async function main() {
    try {
        console.log(`Starting migration to ${TARGET_ENV}`);
        await migrateActivities();
        await migrateWorkRequests();
        await migrateExperienceStatistics();
        await migrateReactions();
        console.log("Migration completed");
    } catch (e) {
        console.error("Migration failed");
        console.error(e);
        process.exit(1);
    }
}

main();
