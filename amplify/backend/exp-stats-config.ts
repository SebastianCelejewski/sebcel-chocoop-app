import { Stack } from "aws-cdk-lib";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { StartingPosition, EventSourceMapping } from "aws-cdk-lib/aws-lambda";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction as LambdaFunctionTarget } from "aws-cdk-lib/aws-events-targets";
import { BackendContext } from "./types";

export function configureExpStats({ backend, envName, activityTableParam, expStatsTableParam }: BackendContext) {
    const activityTable = backend.data.resources.tables["Activity"];
    const expStatsTable = backend.data.resources.tables["ExperienceStatistics"];

    const streamDataPolicy = new Policy(
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

    const activitiesReadPolicy = new Policy(
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
                }),
            ],
        }
    );

    const expStatsReadWritePolicy = new Policy(
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
                }),
            ],
        }
    );

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
    backend.expStatsUpdateFunction.resources.lambda.role?.attachInlinePolicy(streamDataPolicy);
    backend.expStatsUpdateFunction.resources.lambda.role?.attachInlinePolicy(activitiesReadPolicy);
    backend.expStatsUpdateFunction.resources.lambda.role?.attachInlinePolicy(expStatsReadWritePolicy);

    const streamMapping = new EventSourceMapping(
        Stack.of(activityTable),
        "sebcel-chocoop-dynamodb-function-stream-mapping-" + envName,
        {
            target: backend.expStatsUpdateFunction.resources.lambda,
            eventSourceArn: activityTable.tableStreamArn,
            startingPosition: StartingPosition.LATEST,
        }
    );
    streamMapping.node.addDependency(streamDataPolicy);

    // Nightly recalculation

    const nightlyParametersReadPolicy = new Policy(
        Stack.of(activityTable),
        "sebcel-chocoop-nightly-parameters-read-policy-" + envName,
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

    const nightlyActivitiesReadPolicy = new Policy(
        Stack.of(activityTable),
        "sebcel-chocoop-nightly-activities-read-policy-" + envName,
        {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "dynamodb:GetItem",
                        "dynamodb:Query",
                        "dynamodb:Scan",
                    ],
                    resources: [activityTable.tableArn],
                }),
            ],
        }
    );

    const nightlyExpStatsReadWritePolicy = new Policy(
        Stack.of(activityTable),
        "sebcel-chocoop-nightly-exp-stats-readwrite-policy-" + envName,
        {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "dynamodb:PutItem",
                        "dynamodb:GetItem",
                        "dynamodb:DeleteItem",
                        "dynamodb:Query",
                        "dynamodb:Scan",
                    ],
                    resources: [expStatsTable.tableArn],
                }),
            ],
        }
    );

    backend.expStatsNightlyRecalcFunction.resources.lambda.role?.attachInlinePolicy(nightlyParametersReadPolicy);
    backend.expStatsNightlyRecalcFunction.resources.lambda.role?.attachInlinePolicy(nightlyActivitiesReadPolicy);
    backend.expStatsNightlyRecalcFunction.resources.lambda.role?.attachInlinePolicy(nightlyExpStatsReadWritePolicy);

    const nightlyRecalcRule = new Rule(
        Stack.of(activityTable),
        "sebcel-chocoop-nightly-recalc-rule-" + envName,
        {
            schedule: Schedule.cron({ minute: "0", hour: "2", day: "*", month: "*", year: "*" }),
        }
    );
    nightlyRecalcRule.addTarget(
        new LambdaFunctionTarget(backend.expStatsNightlyRecalcFunction.resources.lambda)
    );
}
