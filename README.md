# Project Analytics Dashboard

A Next.js application that helps you monitor and analyze your projects by tracking errors and issues from Google Search API.

## Features

- Create, read, update, and delete projects
- Track project URLs and monitor their status
- Fetch and display errors from Google Search API
- View analytics and statistics for each project
- Modern and responsive UI with Tailwind CSS

## Prerequisites

- Node.js 18.x or later
- PostgreSQL database (using Neon in this example)
- Google Search API credentials (for production use)

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd project-analytics-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables:
   Create a `.env` file in the root directory with the following content:

```
DATABASE_URL="your-postgresql-connection-string"
```

4. Run database migrations:

```bash
npx prisma migrate dev
```

5. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Usage

1. **Adding a Project**

   - Click the "Add Project" button
   - Enter the project name and URL
   - Click "Create" to save the project

2. **Viewing Analytics**

   - Switch to the "Analytics" tab
   - Select a project from the dropdown
   - Click "Fetch Errors" to get the latest data from Google Search API

3. **Managing Projects**
   - Use the edit and delete buttons to modify or remove projects
   - View project details and associated errors in the analytics view

## Development

The application is built with:

- Next.js 14
- TypeScript
- Tailwind CSS
- Prisma ORM
- React Query
- Heroicons

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
