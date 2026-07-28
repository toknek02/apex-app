import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'STAFF'
      department: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: 'ADMIN' | 'STAFF'
    department?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'ADMIN' | 'STAFF'
    department?: string | null
  }
}
