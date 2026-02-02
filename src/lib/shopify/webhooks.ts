// Register a webhook with Shopify
export async function registerWebhook(
  storeDomain: string,
  accessToken: string,
  topic: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://${storeDomain}/admin/api/2024-01/webhooks.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: webhookUrl,
            format: 'json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to register webhook:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log(`Webhook registered for ${topic}:`, data.webhook.id);
    return { success: true };
  } catch (error) {
    console.error('Webhook registration error:', error);
    return { success: false, error: String(error) };
  }
}

// Delete existing webhooks for a topic
export async function deleteWebhooksForTopic(
  storeDomain: string,
  accessToken: string,
  topic: string
): Promise<void> {
  try {
    // Get all webhooks
    const response = await fetch(
      `https://${storeDomain}/admin/api/2024-01/webhooks.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch webhooks');
      return;
    }

    const data = await response.json();
    const webhooks = data.webhooks || [];

    // Filter webhooks for this topic
    const topicWebhooks = webhooks.filter((w: any) => w.topic === topic);

    // Delete each webhook
    for (const webhook of topicWebhooks) {
      await fetch(
        `https://${storeDomain}/admin/api/2024-01/webhooks/${webhook.id}.json`,
        {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`Deleted webhook ${webhook.id} for ${topic}`);
    }
  } catch (error) {
    console.error('Error deleting webhooks:', error);
  }
}

// Setup all required webhooks for the app
export async function setupShopifyWebhooks(
  storeDomain: string,
  accessToken: string,
  appUrl: string
): Promise<{ success: boolean; error?: string }> {
  const topic = 'orders/create';
  const webhookUrl = `${appUrl}/api/webhooks/shopify/orders`;

  // Delete any existing webhooks for this topic to avoid duplicates
  await deleteWebhooksForTopic(storeDomain, accessToken, topic);

  // Register the webhook
  return registerWebhook(storeDomain, accessToken, topic, webhookUrl);
}
