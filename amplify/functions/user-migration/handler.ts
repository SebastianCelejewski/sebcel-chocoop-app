import {
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
    AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION
});

export const handler = async (event: any) => {

    console.log("Migration trigger invoked");
    console.log(JSON.stringify(event));

    const username = event.userName;
    const password = event.request.password;

    try {

        await cognito.send(
            new AdminInitiateAuthCommand({
                UserPoolId: process.env.OLD_USER_POOL_ID!,
                ClientId: process.env.OLD_CLIENT_ID!,
                AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password
                }
            })
        );

        const oldUser = await cognito.send(
            new AdminGetUserCommand({
                UserPoolId: process.env.OLD_USER_POOL_ID!,
                Username: username
            })
        );

        const attrs = oldUser.UserAttributes ?? [];

        const mappedAttributes: Record<string, string> = {};

        for (const attr of attrs) {
            if (attr.Name && attr.Value && attr.Name !== "sub") {
                mappedAttributes[attr.Name] = attr.Value;
            }
        }

        event.response.userAttributes = mappedAttributes;

        event.response.finalUserStatus = "CONFIRMED";
        event.response.messageAction = "SUPPRESS";

        console.log("Returning event", JSON.stringify(event, null, 2));

        return event;

    } catch (e) {

        console.error("Migration failed", e);

        throw e;
    }
};