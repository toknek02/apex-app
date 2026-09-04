import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      roleId: string
      roleName: string
      permissions: string[]
      department: string | null
      mustCompleteSetup: boolean
    } & DefaultSession['user']
  }

  interface User {
    roleId: string
    roleName: string
    permissions: string[]
    department?: string | null
    sessionId?: string
    mustCompleteSetup?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roleId: string
    roleName: string
    permissions: string[]
    department?: string | null
    sessionId?: string
    mustCompleteSetup?: boolean
  }
}
