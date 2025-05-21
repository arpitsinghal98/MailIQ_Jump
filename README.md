# MailIQ - Intelligent Email Management System

MailIQ is a powerful email management application that helps users organize, categorize, and manage their Gmail accounts efficiently. It provides intelligent email categorization, real-time synchronization, and advanced email management features.

## Features

### Email Management
- **Gmail Integration**: Seamless integration with Gmail accounts
- **Real-time Sync**: Automatic synchronization of emails with Gmail
- **Email Categorization**: Create custom categories to organize emails
- **Email Actions**:
  - Move emails between categories
  - Delete emails
  - Unsubscribe from mailing lists
  - Download attachments
  - View full email content

### User Interface
- **Three-Panel Layout**:
  - Categories panel
  - Emails list panel
  - Email details panel
- **Responsive Design**: Adjustable panel widths
- **Modern UI**: Built with React and Tailwind CSS
- **Real-time Updates**: Live email synchronization

### Security
- **OAuth2 Authentication**: Secure Gmail account integration
- **Token Management**: Secure handling of access and refresh tokens
- **Session Management**: Secure user sessions

## Technical Stack

### Frontend
- React
- Remix
- Tailwind CSS
- TypeScript
- React Hot Toast for notifications

### Backend
- Node.js
- Remix
- Drizzle ORM
- PostgreSQL (Neon Serverless)
- Google APIs

### Authentication
- Google OAuth2
- Session-based authentication

### Database Schema
- Users
- Categories
- Emails
- Linked Accounts
- Sync Jobs

## Setup Instructions

1. **Prerequisites**
   - Node.js >= 20.0.0
   - PostgreSQL database
   - Google Cloud Platform account with Gmail API enabled

2. **Environment Variables**
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL=your_postgresql_url
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://yourdomain/auth/google/callback
   SESSION_SECRET=random_string
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Installation**
   ```bash
   npm install
   ```

4. **Database Setup**
   ```bash
   npm run db:migrate
   ```

5. **Development**
   ```bash
   npm run dev
   ```

6. **Build**
   ```bash
   npm run build
   ```

## API Endpoints

### Authentication
- `/auth/google` - Google OAuth login
- `/auth/google/callback` - Google OAuth callback
- `/auth/gmail/callback` - Gmail integration callback

### Email Management
- `/api/emails` - Get emails
- `/api/emails/sync` - Sync emails
- `/api/emails/stream` - Stream email updates
- `/api/fetch-full-email` - Get full email content

### Dashboard Actions
- `/dashboard/add-category` - Create new category
- `/dashboard/update-category` - Update category
- `/dashboard/delete-category` - Delete category
- `/dashboard/move-emails` - Move emails between categories
- `/dashboard/delete-emails` - Delete emails
- `/dashboard/sync-emails` - Trigger email sync
- `/dashboard/unsubscribe-emails` - Unsubscribe from mailing lists

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run linter
- `npm run typecheck` - Check TypeScript types

### Testing
- Jest for unit testing
- Playwright for end-to-end testing
- MSW for API mocking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
