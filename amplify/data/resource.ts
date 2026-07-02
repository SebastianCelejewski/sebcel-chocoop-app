import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
    Activity: a
        .model({
            id: a.id().required(),
            user: a.string().required(),
            date: a.date().required(),
            type: a.string().required(),
            exp: a.integer().required(),
            comment: a.string().required(),
            requestedAs: a.string(),
            source: a.string(),
            scope: a.string().required(),
            reactions: a.hasMany("Reaction", "activityId")
        })
        .secondaryIndexes((index) => [
            index("scope").sortKeys(["date"]),
            index("user").sortKeys(["date"])
        ])
        .authorization((allow) => [allow.authenticated()]),
    WorkRequest: a
        .model({
            id: a.id().required(),
            createdBy: a.string().required(),
            createdDate: a.date().required(),
            type: a.string().required(),
            exp: a.integer().required(),
            urgency: a.integer().required(),
            instructions: a.string().required(),
            completed: a.boolean().required(),
            completedAs: a.string()
        })
        .authorization((allow) => [allow.authenticated()]),
    ExperienceStatistics: a
        .model({
            periodType: a.string().required(),
            period: a.string().required(),
            user: a.string().required(),
            exp: a.integer().required()
        })
        .authorization((allow) => [allow.authenticated()]),
    Reaction: a
        .model({
            id: a.id().required(),
            activityId: a.id().required(),
            activity: a.belongsTo("Activity", "activityId"),
            user: a.string().required(),
            reaction: a.string().required()
        })
        .authorization((allow) => [allow.authenticated()]),
});

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: "userPool"
      },
  });

export type Schema = ClientSchema<typeof schema>;