import { getGmailClient } from "~/lib/gmail.server";

export async function setupGmailWatch(accessToken: string, refreshToken: string) {
  try {
    const gmail = getGmailClient(accessToken, refreshToken);
    
    // Set up watch on INBOX
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: 'projects/psychic-bedrock-457106-m4/topics/gmail-push-new-email',
      },
    });

    console.log("Gmail watch Started");

    return res.data;
  } catch (error) {
    console.error('❌ Failed to set up Gmail watch:', error);
    throw error;
  }
} 