import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

import { Stack } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { StartingPosition, EventSourceMapping } from "aws-cdk-lib/aws-lambda";
import { BackupPlan, BackupPlanRule, BackupResource, BackupVault } from "aws-cdk-lib/aws-backup";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Duration } from "aws-cdk-lib/core";

import { expStatsUpdateFunction } from "./functions/exp-stats-update-function/resource";

const envName = process.env.CHOCOOP_ENV;

if (!envName) {
    throw new Error("CHOCOOP_ENV is not set");
}

const backend = defineBackend({
    auth,
    data,
    expStatsUpdateFunction,
});

const { cfnUserPool } = backend.auth.resources.cfnResources;
const activityTable = backend.data.resources.tables["Activity"];
const expStatsTable = backend.data.resources.tables["ExperienceStatistics"];

cfnUserPool.policies = {
    passwordPolicy: {
        minimumLength: 6,
        requireLowercase: false,
        requireNumbers: false,
        requireSymbols: false,
        requireUppercase: false,
        temporaryPasswordValidityDays: 20,
    },
};

const activityTableParam = new cdk.aws_ssm.StringParameter(
    Stack.of(activityTable),
    "chocoop-activity-table-name-param-" + envName,
    {
        parameterName: `/chocoop/activity-table-name-${envName}`,
        stringValue: activityTable.tableName,
    }
);

const expStatsTableParam = new cdk.aws_ssm.StringParameter(
    Stack.of(activityTable),
    "chocoop-expstats-table-name-param-" + envName,
    {
        parameterName: `/chocoop/exp-stats-table-name-${envName}`,
        stringValue: expStatsTable.tableName,
    }
);

const dynamodbActivitiesStreamDataPolicy = new Policy(
    Stack.of(activityTable),
    "chocoop-dynamodb-stream-data-policy-" + envName,
    {
        statements: [
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "dynamodb:DescribeStream",
                    "dynamodb:GetRecords",
                    "dynamodb:GetShardIterator",
                    "dynamodb:ListStreams",
                ],
                resources: ["*"],
            }),
        ],
    }
);

const dynamodbActivitiesReadPolicy = new Policy(
    Stack.of(activityTable),
    "chocoop-dynamodb-activities-read-policy-" + envName,
    {
        statements: [
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "dynamodb:GetItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
                "dynamodb:Scan",
            ],
            resources: [activityTable.tableArn],
        })
    ]});

const dynamodbExpStatsReadWritePolicy = new Policy(
    Stack.of(activityTable),
    "chocoop-dynamodb-exp-stats-readwrite-policy-" + envName,
    {
        statements: [
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan",
            ],
            resources: [expStatsTable.tableArn],
        })
    ]});
        
const parametersReadPolicy = new Policy(
    Stack.of(activityTable),
    "chocoop-parameters-read-policy-" + envName,
    {
        statements: [
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:GetParametersByPath"
            ],
            resources: [
                activityTableParam.parameterArn,
                expStatsTableParam.parameterArn
            ],
        }),
        ],
    }
);

backend.expStatsUpdateFunction.resources.lambda.role?.attachInlinePolicy(parametersReadPolicy);
backend.expStatsUpdateFunction.resources.lambda.role?.attachInlinePolicy(dynamodbActivitiesStreamDataPolicy);
backend.expStatsUpdateFunction.resources.lambda.role?.attachInlinePolicy(dynamodbActivitiesReadPolicy);
backend.expStatsUpdateFunction.resources.lambda.role?.attachInlinePolicy(dynamodbExpStatsReadWritePolicy);

const mapping = new EventSourceMapping(
    Stack.of(activityTable),
    "chocoop-dynamodb-function-stream-mapping-" + envName,
    {
        target: backend.expStatsUpdateFunction.resources.lambda,
        eventSourceArn: activityTable.tableStreamArn,
        startingPosition: StartingPosition.LATEST,
    }
);

mapping.node.addDependency(dynamodbActivitiesStreamDataPolicy);

const cognitoListUsersPolicy = new Policy(
    Stack.of(backend.auth.resources.userPool),
    "chocoop-cognito-list-users-policy-" + envName,
    {
        statements: [
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["cognito-idp:ListUsers"],
                resources: [backend.auth.resources.userPool.userPoolArn],
            }),
        ],
    }
);

const eventBridgePublishPolicy = new Policy(
    Stack.of(backend.auth.resources.userPool),
    "chocoop-eventbridge-publish-policy-" + envName,
    {
        statements: [
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["events:PutEvents"],
                resources: [`arn:aws:events:eu-central-1:953201351151:event-bus/sebcel-chocoop-infra-bus-${envName}`],
            }),
        ],
    }
);


backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(cognitoListUsersPolicy);
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(eventBridgePublishPolicy);

const { amplifyDynamoDbTables } = backend.data.resources.cfnResources;

for (const table of Object.values(amplifyDynamoDbTables)) {
    table.pointInTimeRecoveryEnabled = true;
}

const backupStack = backend.createStack("chocoop-backup-stack-" + envName);
const myTables = Object.values(backend.data.resources.tables);

const vault = new BackupVault(backupStack, "chocoop-backup-vault-" + envName, {
    backupVaultName: "chocoop-backup-vault-" + envName,
});

const plan = new BackupPlan(backupStack, "chocoop-backup-plan-" + envName, {
    backupPlanName: "chocoop-backup-plan-" + envName,
    backupVault: vault,
});

plan.addRule(
    new BackupPlanRule({
        deleteAfter: Duration.days(60),
        ruleName: "chocoop-backup-plan-rule-" + envName,
        scheduleExpression: Schedule.cron({
            minute: "0",
            hour: "0",
            day: "*",
            month: "*",
            year: "*",
        }),
    })
);

plan.addSelection("chocoop-backup-plan-selection-" + envName, {
    resources: myTables.map((table) => BackupResource.fromDynamoDbTable(table)),
    allowRestores: true,
});