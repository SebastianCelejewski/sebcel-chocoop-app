import argparse
import boto3
from boto3.dynamodb.conditions import Attr


def parse_args():
    parser = argparse.ArgumentParser(
        description="Add scope=ALL to all Activity records in DynamoDB"
    )
    parser.add_argument("--table", required=True, help="DynamoDB table name")
    parser.add_argument("--region", required=True, help="AWS region")
    parser.add_argument("--profile", required=True, help="AWS profile")
    return parser.parse_args()


def main():
    args = parse_args()

    session = boto3.Session(
        profile_name=args.profile,
        region_name=args.region,
    )

    dynamodb = session.resource("dynamodb")
    table = dynamodb.Table(args.table)

    scan_kwargs = {
        "FilterExpression": Attr("scope").not_exists()
    }

    scanned = 0
    updated = 0

    while True:
        response = table.scan(**scan_kwargs)
        items = response.get("Items", [])

        for item in items:
            scanned += 1

            item_id = item["id"]

            try:
                table.update_item(
                    Key={"id": item_id},
                    UpdateExpression="SET #s = :scope",
                    ExpressionAttributeNames={
                        "#s": "scope",
                    },
                    ExpressionAttributeValues={
                        ":scope": "ALL",
                    },
                )

                updated += 1
                print(f"[UPDATED] id={item_id}")

            except Exception as e:
                print(f"[ERROR] id={item_id}: {e}")

        if "LastEvaluatedKey" not in response:
            break

        scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]

    print("Migration finished")
    print(f"Scanned items : {scanned}")
    print(f"Updated items : {updated}")


if __name__ == "__main__":
    main()