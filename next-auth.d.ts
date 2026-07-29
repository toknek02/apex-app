import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      roleId: string
      roleName: string
      permissions: string[]
      department: string | null
    } & DefaultSession['user']
  }

  interface User {
    roleId: string
    roleName: string
    permissions: string[]
    department?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roleId: string
    roleName: string
    permissions: string[]
    department?: string | null
  }
}
