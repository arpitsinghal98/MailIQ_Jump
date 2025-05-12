import { google } from 'googleapis'

export async function fetchNewEmails(historyId: string) {
  const auth = await getOAuthClient()
  const gmail = google.gmail({ version: 'v1', auth })

  const { data } = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: historyId,
    historyTypes: ['messageAdded'],
  })

  const newMessages = data.history?.flatMap(h => h.messages) ?? []

  const emails = await Promise.all(
    newMessages.map(async (msg) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })

      return {
        id: msg.id!,
        subject: extractHeader(full.data, 'Subject'),
        from: extractHeader(full.data, 'From'),
        snippet: full.data.snippet || '',
        receivedAt: new Date(Number(full.data.internalDate)),
      }
    })
  )

  return emails
}

function extractHeader(message: any, name: string) {
  return message.payload.headers.find((h: any) => h.name === name)?.value || '-'
}

function getOAuthClient() {
    throw new Error('Function not implemented.')
}
