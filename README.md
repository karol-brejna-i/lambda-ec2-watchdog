# AWS Lambda to keep an eye on EC2 instances lifespan

This example is structured as [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html), or Serverless Application Model, project.
This makes it easeier to understand the intent of the project and to manage the project lifecycle (develop, test, deploy).



**The goal** of the code is to find out running EC2 instances that are "supsected" to overrun their expected lifetime. This way the users can be notified about that fact and react accordingly to avoid excesseve costs (the code could be also automatically terminating the instances, but this option is not included).

The key assumption here is: 
- whenever an EC2 insance is created, it is tagged with time-to-live value (hours).

The code simply periodically browses thorugh the running instances and determines if they are running longer then expected TTL.



The AWS SAM template deploys the resources and the IAM permissions required to run the application.

Learn more about this pattern at Serverless Land Patterns: https://serverlessland.com/patterns/lambda-sns/.

    Important: this application uses various AWS services and there are costs associated with these services after the Free Tier usage - please see the [AWS Pricing page](https://aws.amazon.com/pricing/) for details. You are responsible for any AWS costs incurred. No warranty is implied in this example.

## Requirements

This example assumes that the following prerequisities are fullfiled:
* [Create an AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html) if you do not already have one and log in. The IAM user that you use must have sufficient permissions to make necessary AWS service calls and manage AWS resources.
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed and configured
* [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) (AWS SAM) installed


## Build and deploy

First, build the package to be deployed to AWS:
```bash
sam build
```

Then deploy the package. If you are doing it for the fist time, you could use:

```bash  
sam deploy --guided
```

This will guide you through the deployment process and ask for required input/values:
- stack name
- Desired AWS Region
- Notification topic name
* If you want ot allow SAM CLI to create IAM roles with the required permissions (choose 'Yes')

        Once you have run `sam deploy -guided` mode once and saved arguments to a configuration file (samconfig.toml), you can use `sam deploy` in future to use these defaults.


Note the outputs from the SAM deployment process. These contain the resource names and/or ARNs which are used for testing.


### Testing
TBD



## Cleanup
 
1. Delete the stack
    ```bash
    aws cloudformation delete-stack --stack-name STACK_NAME
    ```
1. Confirm the stack has been deleted
    ```bash
    aws cloudformation list-stacks --query "StackSummaries[?contains(StackName,'STACK_NAME')].StackStatus"
    ```
