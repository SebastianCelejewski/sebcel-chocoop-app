import * as cdk from "aws-cdk-lib";
import { Stack } from "aws-cdk-lib";
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { BackendContext } from "./types";

export function configureDatabaseResources(backend: any, envName: string): BackendContext {
    const activityTable = backend.data.resources.tables["Activity"];
    const expStatsTable = backend.data.resources.tables["ExperienceStatistics"];

    const activityTableParam = new cdk.aws_ssm.StringParameter(
        Stack.of(activityTable),
        "sebcel-chocoop-activity-table-name-param-" + envName,
        {
            parameterName: `/sebcel-chocoop-app/activity-table-name-${envName}`,
            stringValue: activityTable.tableName,
        }
    );

    const expStatsTableParam = new cdk.aws_ssm.StringParameter(
        Stack.of(activityTable),
        "sebcel-chocoop-expstats-table-name-param-" + envName,
        {
            parameterName: `/sebcel-chocoop-app/exp-stats-table-name-${envName}`,
            stringValue: expStatsTable.tableName,
        }
    );

    const { amplifyDynamoDbTables } = backend.data.resources.cfnResources;

    for (const table of Object.values(amplifyDynamoDbTables) as any[]) {
        table.pointInTimeRecoveryEnabled = true;
    }

    for (const tableName of ["Reaction", "WorkRequest"]) {
        amplifyDynamoDbTables[tableName].streamSpecification = {
            streamViewType: StreamViewType.NEW_AND_OLD_IMAGES
        };
    }

    return { backend, envName, activityTableParam, expStatsTableParam };
}
