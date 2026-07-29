import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roleId = user.roleId
        token.roleName = user.roleName
        token.permissions = user.permissions
        token.department = user.department ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === 'string' ? token.id : ''
        session.user.roleId = typeof token.roleId === 'string' ? token.roleId : ''
        session.user.roleName = typeof token.roleName === 'string' ? token.roleName : ''
        session.user.permissions = Array.isArray(token.permissions) ? (token.permissions as string[]) : []
        session.user.department = typeof token.department === 'string' ? token.department : null
      }
      return session
    },
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        })
        if (!user || !user.isActive) return null

        const passwordValid = await bcrypt.compare(password, user.passwordHash)
        if (!passwordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          roleName: user.role.name,
          permissions: user.role.rolePermissions.map((rp) => rp.permission.code),
          department: user.department,
        }
      },
    }),
  ],
})
