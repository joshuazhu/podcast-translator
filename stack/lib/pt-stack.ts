import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";

export class PTStack extends cdk.Stack {
    public readonly bucketName: string;
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, "podcast-video-bucket", {
            bucketName: "podcast-video-bucket",
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        this.bucketName = bucket.bucketName;

        const s3ReadWriteBucketsPolicy = new iam.PolicyStatement({
            actions: ["s3:ListAllMyBuckets"],
            resources: ["arn:aws:s3:::*"],
        });

        const role = iam.Role.fromRoleArn(
            this,
            "lambdaRole",
            `arn:aws:iam::${this.account}:role/podcast-translator-dev-${this.region}-lambdaRole`,
            {
                mutable: true,
            }
        );

        role.addToPrincipalPolicy(s3ReadWriteBucketsPolicy);
    }
}
