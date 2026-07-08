// AWS SNS SMS integration — used for Asia region routing.
// Requires @aws-sdk/client-sns to be installed.
// Env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (default "ap-southeast-1"), AWS_SNS_SENDER_ID

export async function sendSmsSns({
  to,
  message,
  senderId,
}: {
  to: string;
  message: string;
  senderId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Check if the AWS SDK is available at runtime
  let SNSClient: any;
  let PublishCommand: any;

  try {
    // @ts-expect-error — optional peer dep, may not be installed
    const mod = await import(/* webpackIgnore: true */ "@aws-sdk/client-sns");
    SNSClient = mod.SNSClient;
    PublishCommand = mod.PublishCommand;
  } catch {
    return { success: false, error: "AWS SNS not configured — @aws-sdk/client-sns is not installed" };
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "ap-southeast-1";
  const resolvedSenderId = senderId || process.env.AWS_SNS_SENDER_ID;

  if (!accessKeyId || !secretAccessKey) {
    return { success: false, error: "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY." };
  }

  try {
    const client = new SNSClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const messageAttributes: Record<string, any> = {
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
    };

    if (resolvedSenderId) {
      messageAttributes["AWS.SNS.SMS.SenderID"] = {
        DataType: "String",
        StringValue: resolvedSenderId,
      };
    }

    const command = new PublishCommand({
      Message: message,
      PhoneNumber: to,
      MessageAttributes: messageAttributes,
    });

    const response = await client.send(command);
    return { success: true, messageId: response.MessageId };
  } catch (error: any) {
    console.error("[SMS/SNS] Error:", error);
    return { success: false, error: error?.message || "AWS SNS send failed" };
  }
}
