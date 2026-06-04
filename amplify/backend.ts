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
import { userMigrationFunction } from "./functions/user-migration/resource";
import * as cognito from "aws-cdk-lib/aws-cognito";

const envName = process.env.CHOCOOP_ENV;

if (!envName) {
    throw new Error("CHOCOOP_ENV is not set");
}

const backend = defineBackend({
    auth,
    data,
    expStatsUpdateFunction,
    userMigrationFunction
});

const activityTable = backend.data.resources.tables["Activity"];
const expStatsTable = backend.data.resources.tables["ExperienceStatistics"];

const authResources = backend.auth.resources.cfnResources;
const userPool = authResources.cfnUserPool;
const userPoolClient = authResources.cfnUserPoolClient as cognito.CfnUserPoolClient;

userPool.policies = {
    passwordPolicy: {
        minimumLength: 6,
        requireLowercase: false,
        requireNumbers: false,
        requireSymbols: false,
        requireUppercase: false,
        temporaryPasswordValidityDays: 20,
    },
};

userPoolClient.explicitAuthFlows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH"
];

userPool.addPropertyOverride(
    "LambdaConfig.UserMigration",
    backend.userMigrationFunction.resources.lambda.functionArn
);

backend.userMigrationFunction.resources.lambda.addPermission(
    "CognitoInvokePermission",
    {
        principal: new cdk.aws_iam.ServicePrincipal("cognito-idp.amazonaws.com"),
        action: "lambda:InvokeFunction"
    }
);

backend.userMigrationFunction.resources.lambda.addPermission(
    "CognitoInvokePermission2",
    {
        principal: new cdk.aws_iam.ServicePrincipal("cognito-idp.amazonaws.com"),
        action: "lambda:InvokeFunction"
    }
);

const cognitoMigrationPolicy = new Policy(
    Stack.of(activityTable),
    "sebcel-chocoop-cognito-migration-policy-" + envName,
    {
        statements: [
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cognito-idp:AdminInitiateAuth",
                    "cognito-idp:AdminGetUser"
                ],
                resources: [
                    "arn:aws:cognito-idp:eu-central-1:953201351151:userpool/eu-central-1_7BujYEqE1"
                ],
            }),
        ],
    }
);

backend.userMigrationFunction.resources.lambda.role?.attachInlinePolicy(cognitoMigrationPolicy);

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

const dynamodbActivitiesStreamDataPolicy = new Policy(
    Stack.of(activityTable),
    "sebcel-chocoop-dynamodb-stream-data-policy-" + envName,
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
    "sebcel-chocoop-dynamodb-activities-read-policy-" + envName,
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
    "sebcel-chocoop-dynamodb-exp-stats-readwrite-policy-" + envName,
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
    "sebcel-chocoop-parameters-read-policy-" + envName,
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
    "sebcel-chocoop-dynamodb-function-stream-mapping-" + envName,
    {
        target: backend.expStatsUpdateFunction.resources.lambda,
        eventSourceArn: activityTable.tableStreamArn,
        startingPosition: StartingPosition.LATEST,
    }
);

mapping.node.addDependency(dynamodbActivitiesStreamDataPolicy);

const cognitoListUsersPolicy = new Policy(
    Stack.of(backend.auth.resources.userPool),
    "sebcel-chocoop-cognito-list-users-policy-" + envName,
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
    "sebcel-chocoop-eventbridge-publish-policy-" + envName,
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

const backupStack = backend.createStack("sebcel-chocoop-backup-stack-" + envName);
const myTables = Object.values(backend.data.resources.tables);

const vault = new BackupVault(backupStack, "sebcel-chocoop-backup-vault-" + envName, {
    backupVaultName: "sebcel-chocoop-backup-vault-" + envName,
});

const plan = new BackupPlan(backupStack, "sebcel-chocoop-backup-plan-" + envName, {
    backupPlanName: "sebcel-chocoop-backup-plan-" + envName,
    backupVault: vault,
});

plan.addRule(
    new BackupPlanRule({
        deleteAfter: Duration.days(60),
        ruleName: "sebcel-chocoop-backup-plan-rule-" + envName,
        scheduleExpression: Schedule.cron({
            minute: "0",
            hour: "0",
            day: "*",
            month: "*",
            year: "*",
        }),
    })
);

plan.addSelection("sebcel-chocoop-backup-plan-selection-" + envName, {
    resources: myTables.map((table) => BackupResource.fromDynamoDbTable(table)),
    allowRestores: true,
});