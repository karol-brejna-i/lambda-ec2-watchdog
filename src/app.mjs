import { EC2Client, DescribeInstancesCommand, CreateTagsCommand, DescribeTagsCommand } from "@aws-sdk/client-ec2";


const awsRegion = process.env.AWS_REGION;
const topicArn = process.env.SNStopic;
const DEFAULT_TTL_VALUE = process.env.DEFAULT_TTL_VALUE || '0';
console.info(`Region: ${awsRegion}; topicArn: ${topicArn}`);


// initialize ec2 client
const ec2Client = new EC2Client({ region: awsRegion });

/**
 * Function that list EC2 instances with specific tag-key.
 * 
 * @param {string} tagKey - tag name
 * @param {string} state - 
 *          instance-state-name - The state of the instance (pending | running | shutting-down | terminated | stopping | stopped). 
 *          (see: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ec2/interfaces/describeinstancescommandinput.html)
 * @returns https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ec2/interfaces/describeinstancescommandoutput.html
 */
const listEC2 = async (tagKey, state) => {
  console.info(`listEC2WithTag: tagKey=${tagKey}, state=${state}`);

  // construct Filters
  const filters = [];
  if (tagKey) {
    filters.push({ Name: "tag-key", Values: [tagKey] });
  }

  if (state) {
    filters.push({ Name: "instance-state-name", Values: [state] });
  }
  console.debug("filters", filters);

  // get the instances
  const command = new DescribeInstancesCommand({ Filters: filters });
  const data = await ec2Client.send(command);
  return data;
}

/**
 * Return lighter instance descriptions, containing only essential data (from the perspective of further processing).
 * 
 * @param {*} runningInstancesWithTTL 
 * @returns 
 */
const createDescriptions = async (runningInstancesWithTTL) => {
  const now = new Date();
  return runningInstancesWithTTL.map((instance) => {
    const ttl = parseInt(instance.Tags.find((tag) => tag.Key === "TTL")?.Value);
    const launchTime = new Date(instance.LaunchTime);
    const runningTime = (now - launchTime) / (1000 * 60 * 60)
    const overTime = ttl - runningTime
    return {
      instanceId: instance.InstanceId,
      instanceType: instance.InstanceType,
      launchTime,
      TTL: ttl,
      runningTime,
      overTime: overTime >= 0 ? 0 : -overTime,
    };
  });
}

/**
 * 
 *
 * @param {*} event
 */
const watcher = async (event) => {
  console.log("Lambda invoked.");

  // Get EC2 instances 
  const reservationsResponse = await listEC2("TTL", "running");
  console.debug(JSON.stringify(reservationsResponse));

  // keep only running instances <-- you are already doing it with listEC2()
  const runningInstances = reservationsResponse.Reservations
    .flatMap((reservation) => reservation.Instances)
    .filter((instance) => instance.State.Name === "running");

  // keep instances with key tag 'TTL' <-- you are already doing it with listEC2()
  const runningInstancesWithTTL = runningInstances.filter((instance) => {
    return instance.Tags.some((tag) => tag.Key === "TTL");
  });

  // describe instances with TTL and running time
  const instanceDescriptions = await createDescriptions(runningInstancesWithTTL)
  console.debug(instanceDescriptions);

  // find instanceDescription with TTL
  const exceededTimes = instanceDescriptions.filter(instance => instance.overTime > 0);
  console.info('Instances with exceedes running time:', JSON.stringify(exceededTimes));
  const result = { statusCode: 200, body: exceededTimes };
  return result;
}

const getInstanceTags = async (instanceId) => {
    const command = new DescribeTagsCommand({
        Filters: [
            {
                Name: "resource-id",
                Values: [instanceId],
            },
        ],
    });
    const data = await ec2Client.send(command);
    return data.Tags;
}

/**
 * A Lambda function that logs the payload received from a CloudWatch scheduled event.
 */
const scheduledEventLoggerHandler = async (event) => {
  console.log("Scheduled Lambda");
}


/**
 * Tag newly created EC2 instances with TTL (if the tag doesn't already exists).
 */
const autoTag = async (event) => {
  console.info("NEW Lambda Handler");
  console.debug(JSON.stringify(event));

  const instanceId = event.detail['instance-id'];
  console.info(`InstanceId ${instanceId}`);

  const tagParams = {
    Resources: [instanceId],
    Tags: [
      { Key: "TTL", Value: DEFAULT_TTL_VALUE }
    ]
  };

  // TODO: first check if the TTL tag is already set!
  const tagsResponse = await getInstanceTags(instanceId);
  console.info(`${instanceId} tags: ${JSON.stringify(tagsResponse)}`);
  console.info(tagsResponse);

  // tagResponse holds object like:
  //[
  // {
  //   Key: 'Name',
  //   ResourceId: 'i-053733ded3564ceb4',
  //   ResourceType: 'instance',
  //   Value: 'test2'
  // },
  // {
  //   Key: 'TTL',
  //   ResourceId: 'i-053733ded3564ceb4',
  //   ResourceType: 'instance',
  //   Value: '1'
  // }
  //]
  

  // Tag the instance
  try {
    await ec2Client.send(new CreateTagsCommand(tagParams));
    console.log("Instance tagged");
  }
  catch (err) {
    console.error("Error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err,
        stack: err.stack
      })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
};


export { watcher, scheduledEventLoggerHandler, autoTag };
