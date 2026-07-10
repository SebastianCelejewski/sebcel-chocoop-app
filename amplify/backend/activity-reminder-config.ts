import * as cdk from "aws-cdk-lib";
import { Stack } from "aws-cdk-lib";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction as LambdaFunctionTarget } from "aws-cdk-lib/aws-events-targets";
import { BackendContext } from "./types";

const EVENT_BUS_ARN_PREFIX = "arn:aws:events:eu-central-1:953201351151:event-bus";

export function configureActivityReminder({ backend, envName, activityTableParam }: BackendContext) {
    const activityTable = backend.data.resources.tables["Activity"];
    const scope = Stack.of(activityTable);

    const reminderActivityReadPolicy = new Policy(
        scope,
        "sebcel-chocoop-reminder-activity-read-policy-" + envName,
        {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["dynamodb:Scan"],
                    resources: [activityTable.tableArn],
                }),
            ],
        }
    );

    const reminderCognitoPolicy = new Policy(
        scope,
        "sebcel-chocoop-reminder-cognito-policy-" + envName,
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

    const reminderPublishPolicy = new Policy(
        scope,
        "sebcel-chocoop-reminder-publish-policy-" + envName,
        {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["events:PutEvents"],
                    resources: [`${EVENT_BUS_ARN_PREFIX}/sebcel-chocoop-infra-bus-${envName}`],
                }),
            ],
        }
    );

    const userPoolIdParamArn = `arn:aws:ssm:eu-central-1:953201351151:parameter/sebcel-chocoop-app/user-pool-id-${envName}`;

    const reminderSSMPolicy = new Policy(
        scope,
        "sebcel-chocoop-reminder-ssm-policy-" + envName,
        {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
                    resources: [activityTableParam.parameterArn, userPoolIdParamArn],
                }),
            ],
        }
    );

    // Use a plain string path (not a CDK token) to avoid creating a function→auth cross-stack
    // reference. The auth stack already references the function stack via the Cognito migration
    // trigger, so any function→auth reference would create a cycle.
    (backend.activityReminderFunction.resources.lambda as LambdaFunction).addEnvironment(
        "USER_POOL_ID_PARAM", `/sebcel-chocoop-app/user-pool-id-${envName}`
    );

    backend.activityReminderFunction.resources.lambda.role?.attachInlinePolicy(reminderActivityReadPolicy);
    backend.activityReminderFunction.resources.lambda.role?.attachInlinePolicy(reminderCognitoPolicy);
    backend.activityReminderFunction.resources.lambda.role?.attachInlinePolicy(reminderPublishPolicy);
    backend.activityReminderFunction.resources.lambda.role?.attachInlinePolicy(reminderSSMPolicy);

    const activityReminderRule = new Rule(
        scope,
        "sebcel-chocoop-activity-reminder-rule-" + envName,
        {
            schedule: Schedule.cron({ minute: "0", hour: "19", day: "*", month: "*", year: "*" }),
        }
    );
    activityReminderRule.addTarget(
        new LambdaFunctionTarget(backend.activityReminderFunction.resources.lambda)
    );
}
