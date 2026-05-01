# ConnectHub

**Build Meaningful Connections Based on Shared Interests**

ConnectHub is a modern social platform that helps users discover and connect with others who share similar hobbies and interests. With features like user profiles, connection requests, real-time messaging, communities, and push notifications, ConnectHub creates an engaging space for authentic relationship building.

## Features

### Core Social Features
- **User Authentication** - Secure sign-up, login, and password management with email verification
- **User Profiles** - Customizable profiles with display names, avatars, bios, and interest/hobby tags
- **Connection System** - Send and manage connection requests with real-time notifications
- **Messaging** - Direct messaging between connected users with conversation history
- **Communities** - Discover and join communities based on shared interests
- **Home Feed** - Personalized activity feed based on connections and interests

### Technical Features
- **Push Notifications** - Real-time web push notifications for connection requests, messages, and community events
- **Offline Support** - Progressive Web App (PWA) with offline functionality via Service Worker
- **Dark Mode** - Built-in theme switching support for better user experience
- **Admin Dashboard** - Administrative interface for platform management
- **Real-time Updates** - Live notification panel with unread count badges
- **Responsive Design** - Mobile-first design that works seamlessly across all devices

## Tech Stack

### Frontend
- **Next.js 16** - Modern React framework with App Router and SSR
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe JavaScript for better developer experience
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Shadcn/ui** - High-quality, accessible UI components
- **Zustand** - Lightweight state management library
- **Lucide React** - Beautiful icon library

### Backend & Database
- **Supabase** - PostgreSQL database, authentication, and real-time capabilities
- **Next.js API Routes** - Serverless functions for API endpoints
- **Server Actions** - Next.js Server Actions for mutations and side effects

### PWA & Offline
- **Serwist** - Next.js-integrated Service Worker with caching strategies
- **Web Push API** - Native push notifications support

### Development & Quality
- **ESLint** - Code quality and style enforcement
- **Turbopack** - Lightning-fast build tool for development
- **tsx** - TypeScript executor for scripts

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account (free tier available)
- Environment variables configured

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Google GenAI (for recommendation features)
GOOGLE_API_KEY=your_google_api_key
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd connecthub
```

2. Install dependencies:
```bash
npm install
```

3. Seed development data (optional):
```bash
npm run seed
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

The app will automatically redirect unauthenticated users to the login page.

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint to check code quality
- `npm run generate-types` - Generate TypeScript types from Supabase schema
- `npm run supabase:login` - Login to Supabase CLI
- `npm run seed` - Seed development database with sample data

## Project Structure

```
app/
├── (protected)/           # Routes requiring authentication
│   ├── (app)/            # Main app routes
│   │   ├── home/         # Home feed
│   │   ├── connections/  # User connections
│   │   ├── messages/     # Direct messaging
│   │   ├── communities/  # Communities discovery
│   │   ├── profile/      # User profile
│   │   ├── admin/        # Admin dashboard
│   │   └── user/         # User profiles
│   └── onboarding/       # User onboarding flow
├── auth/                 # Authentication pages
│   ├── login/
│   ├── sign-up/
│   ├── forgot-password/
│   └── ...
├── api/                  # API routes
│   ├── push/            # Push notification endpoints
│   ├── communities/     # Community endpoints
│   └── update-profile-embedding/
├── actions/            # Server actions
└── layout.tsx          # Root layout

components/
├── layout/             # Layout components
├── providers/          # Context providers
├── notifications/      # Notification components
├── ui/                 # Shadcn/ui components
└── forms/              # Form components

lib/
├── supabase/           # Supabase client setup
├── server/             # Server utilities (notifications, push)
├── types.ts            # TypeScript type definitions
└── utils.ts            # Utility functions

hooks/
├── use-community-recommendations.ts
├── use-current-user-*.ts
├── use-unread-notifications.ts
└── ...

public/
├── sw.js               # Compiled Service Worker
└── icons/              # App icons and favicon
```

## Authentication Flow

1. Unauthenticated users are redirected to `/auth/login`
2. Users can sign up with email or login with existing credentials
3. After authentication, users access protected routes through `(protected)` layout
4. Session is managed via Supabase and stored in cookies
5. Logout clears the session and redirects to login

## Database Schema

The application uses Supabase PostgreSQL with the following main tables:

- **profiles** - User profile information (display name, avatar, bio, hobbies)
- **hobbies** - Hobby/interest definitions
- **connections** - Connection relationships between users (status: pending/accepted)
- **messages** - Direct messages between users
- **communities** - Community definitions
- **notifications** - In-app notification history
- **push_subscriptions** - User device push notification subscriptions

For full schema details, see `lib/database.types.ts` (auto-generated from Supabase).

## Push Notifications

ConnectHub supports real-time push notifications through:

1. **Service Worker** - Handles push events in the background
2. **Push Subscriptions** - Users can enable/disable push notifications
3. **Notification Types** - Connection requests, messages, community events
4. **Offline Queuing** - Notifications are queued and sent when online

### Push Events
- Connection request received
- Connection request accepted
- New message received
- Post liked/commented on
- Community invitation

## Offline Support

ConnectHub works offline using a Service Worker with the following caching strategy:

- **API Routes** - Network-first (falls back to cache if offline)
- **Static Assets** - Cache-first (serves cached version, updates in background)
- **Supabase Requests** - Network-only (prevents stale auth/data)

Unsaved form data is preserved when going offline, and syncs when connectivity is restored.

## Customization

### Theme
Edit `components/providers/theme-provider.tsx` to customize color schemes or add new themes.

### UI Components
All UI components use Shadcn/ui. Customize component styles in `components/ui/`.

### API Endpoints
Extend API functionality by adding new route files in `app/api/`.

### Server Actions
Add new server mutations in `app/actions/` for server-side operations.

## Performance Optimizations

- **Turbopack** - Fast development builds
- **Service Worker Caching** - Reduced network requests
- **Image Optimization** - Optimized image delivery from Supabase and external sources
- **Code Splitting** - Automatic chunking with Next.js
- **Middleware** - Request processing for session management

## Security

- **Authentication** - Secure auth managed by Supabase
- **RLS Policies** - Row-Level Security on database tables
- **CORS Headers** - X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **Environment Variables** - Sensitive keys never exposed to client
- **Server-Side Validation** - All mutations validated on server

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

```bash
npm run build
npm start
```

### Deploy to Other Platforms

- Ensure Node.js 18+ runtime
- Set all required environment variables
- Build with `npm run build`
- Start with `npm start`

## Development Workflow

### Adding a New Feature

1. Create page/component files
2. Add server actions if needed in `app/actions/`
3. Update types in `lib/types.ts` if needed
4. Add styles using Tailwind and Shadcn/ui components
5. Test with `npm run dev`
6. Lint with `npm run lint`

### Database Changes

After modifying Supabase schema:

```bash
npm run generate-types
```

This generates updated TypeScript types in `lib/database.types.ts`.

### Updating Dependencies

```bash
npm update
npm audit
```

## Common Issues

### Service Worker Not Updating
- Clear browser cache and service workers
- Check browser DevTools > Application > Service Workers

### Push Notifications Not Working
- Ensure user has granted permission
- Check push subscription status in database
- Verify VAPID keys are configured in Supabase

### Authentication Issues
- Clear cookies and session storage
- Verify Supabase credentials in `.env.local`
- Check Supabase Auth settings for allowed redirect URLs

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and test thoroughly
3. Run linting: `npm run lint`
4. Commit with clear messages
5. Push and create a pull request

## License

This project is part of an educational assignment for "Project and Professionalism" course.

## Support

For issues or questions:
- Check existing issues and discussions
- Review code comments for implementation details
- Consult Next.js and Supabase documentation

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn/ui](https://ui.shadcn.com)
