export default function EmailDetailsPanel({
  selectedEmail,
  loading,
  error,
}: {
  selectedEmail:
  | {
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    html: string;
    attachments: {
      filename: string;
      mimeType: string;
      attachmentId: string;
    }[];
  }
  | undefined;
  loading: boolean;
  error: string | null;
}) {
  function fallback(val: string | undefined, fallbackText: string) {
    return val && val.trim() ? val : fallbackText;
  }

  return (
    <section className="flex-1 p-4 w-full overflow-y-auto bg-white h-full scrollbar-custom">
      {loading ? (
        <p className="text-gray-500 italic">Loading email...</p>
      ) : error ? (
        <div className="text-red-500 p-4 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      ) : selectedEmail ? (
        <article className="pb-16">
          <h2 className="text-xl font-semibold mb-2">
            {fallback(selectedEmail.subject, 'No subject')}
          </h2>
          <p className="text-sm text-gray-500 mb-1">
            From: {fallback(selectedEmail.from, 'No sender')}
          </p>
          <p className="text-sm text-gray-500 mb-1">
            To: {fallback(selectedEmail.to, 'No recipient')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Date: {new Date(selectedEmail.date).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>

          {selectedEmail.attachments?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2">Attachments</h3>
              <ul className="space-y-2">
                {selectedEmail.attachments.map((att) => (
                  <li key={att.attachmentId} className="flex items-center gap-2">
                    <span className="text-gray-600">{att.filename}</span>
                    <a
                      href={`/dashboard/download-attachment?messageId=${selectedEmail.id}&attachmentId=${att.attachmentId}`}
                      download={att.filename}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log("📎 Downloading attachment:", {
                          messageId: selectedEmail.id,
                          attachmentId: att.attachmentId,
                        });
                        window.location.href = `/dashboard/download-attachment?messageId=${selectedEmail.id}&attachmentId=${att.attachmentId}`;
                      }}
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 border rounded-lg overflow-hidden">
            <iframe
              title="Email content"
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                      body { margin: 0; padding: 16px; }
                      img { max-width: 100%; height: auto; }
                    </style>
                  </head>
                  <body>
                    ${selectedEmail.html && selectedEmail.html.trim() ? selectedEmail.html : '<p>No content</p>'}
                  </body>
                </html>
              `}
              className="w-full h-[600px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </article>
      ) : (
        <p className="text-gray-500">Select an email to view its full content</p>
      )}
    </section>
  );
}