import { Stack } from "aws-cdk-lib";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { StartingPosition, EventSourceMapping } from "aws-cdk-lib/aws-lambda";
import { BackendContext } from "./types";

const EVENT_BUS_ARN_PREFIX = "arn:aws:events:eu-central-1:953201351151:event-bus";

export function configureDomainEvents({ backend, envName, activityTableParam }: BackendContext) {
    const activityTable = backend.data.resources.tables["Activity"];
    const reactionTable = backend.data.resources.tables["Reaction"];
    const workRequestTable = backend.data.resources.tables["WorkRequest"];
    const userPoolIdParamArn = `arn:aws:ssm:eu-central-1:953201351151:parameter/sebcel-chocoop-app/user-pool-id-${envName}`;

    const streamPolicy = new Policy(
        Stack.of(activityTable),
        "sebcel-chocoop-domain-events-stream-policy-" + envName,
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

    const activityReadPolicy = new Policy(
        Stack.of(activityTable),
        "sebcel-chocoop-domain-events-activity-read-policy-" + envName,
        {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["dynamodb:GetItem"],
                    resources: [activityTable.tableArn],
                }),
            ],
        }
    );

    const publishPolicy = new Policy(
        Stack.of(activityTable),
        "sebcel-chocoop-domain-events-publish-policy-" + envName,
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

    const ssmPolicy = new Policy(
        Stack.of(activityTable),
        "sebcel-chocoop-domain-events-ssm-policy-" + envName,
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

    const cognitoPolicy = new Policy(
        Stack.of(activityTable),
        "sebcel-chocoop-domain-events-cognito-policy-" + envName,
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

    backend.domainEventsFunction.resources.lambda.role?.attachInlinePolicy(streamPolicy);
    backend.domainEventsFunction.resources.lambda.role?.attachInlinePolicy(activityReadPolicy);
    backend.domainEventsFunction.resources.lambda.role?.attachInlinePolicy(publishPolicy);
    backend.domainEventsFunction.resources.lambda.role?.attachInlinePolicy(ssmPolicy);
    backend.domainEventsFunction.resources.lambda.role?.attachInlinePolicy(cognitoPolicy);

    const addStreamMapping = (id: string, tableStreamArn: string) => {
        const mapping = new EventSourceMapping(
            Stack.of(activityTable),
            id,
            {
                target: backend.domainEventsFunction.resources.lambda,
                eventSourceArn: tableStreamArn,
                startingPosition: StartingPosition.LATEST,
            }
        );
        mapping.node.addDependency(streamPolicy);
    };

    addStreamMapping(
        "sebcel-chocoop-domain-events-activity-stream-mapping-" + envName,
        activityTable.tableStreamArn
    );
    addStreamMapping(
        "sebcel-chocoop-domain-events-reaction-stream-mapping-" + envName,
        reactionTable.tableStreamArn
    );
    addStreamMapping(
        "sebcel-chocoop-domain-events-workrequest-stream-mapping-" + envName,
        workRequestTable.tableStreamArn
    );
}
