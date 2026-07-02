import * as cdk from "aws-cdk-lib";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Stack } from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";

export function configureAuth(backend: any, envName: string) {
    const dataStack = Stack.of(backend.data.resources.tables["Activity"]);
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
        dataStack,
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

    backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(cognitoListUsersPolicy);

    // Store user pool ID in SSM so Lambda functions can read it at runtime
    // without creating a cross-stack CDK reference (which would create a cycle
    // since the auth stack already references the function stack via the migration trigger).
    new cdk.aws_ssm.StringParameter(
        Stack.of(backend.auth.resources.userPool),
        "sebcel-chocoop-user-pool-id-param-" + envName,
        {
            parameterName: `/sebcel-chocoop-app/user-pool-id-${envName}`,
            stringValue: backend.auth.resources.userPool.userPoolId,
        }
    );
}
