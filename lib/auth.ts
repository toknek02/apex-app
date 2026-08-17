import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  events: {
    // Logging in is now what starts an office attendance record — there's
    // no separate manual "sign in" button anymore. Signing out of the app
    // ends it. This only fires on an explicit signOut() call; a session
    // that gets silently invalidated by a newer login elsewhere is instead
    // handled in authorize() below, which closes out the old record when
    // the new one opens.
    async signOut(message) {
      const userId = 'token' in message ? message.token?.id : undefined
      if (typeof userId !== 'string') return
      await prisma.signInRecord.updateMany({
        where: { userId, signOutAt: null },
        data: { signOutAt: new Date() },
      })
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in: the sessionId minted in authorize() is now the account's one
        // valid session. Embed it in this token so later requests can detect if a
        // newer login elsewhere has superseded it.
        token.id = user.id
        token.roleId = user.roleId
        token.roleName = user.roleName
        token.permissions = user.permissions
        token.department = user.department ?? null
        token.sessionId = user.sessionId
        return token
      }

      // Existing session being re-validated: if the account has since logged in
      // elsewhere, that login overwrote activeSessionId, so this token's sessionId
      // no longer matches — end this session.
      if (typeof token.id === 'string') {
        const current = await prisma.user.findUnique({ where: { id: token.id }, select: { activeSessionId: true } })
        if (!current || current.activeSessionId !== token.sessionId) return null
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
        identifier: { label: 'Name or Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null

        const identifier = (credentials.identifier as string).trim()
        const password = credentials.password as string

        // Login is by username (the short Name set by HR/Admin) going
        // forward, but falls back to matching email too — accounts created
        // before this field existed have no username yet and keep working
        // via the email they already have. Checked as two separate,
        // ordered lookups (not one OR) so a username match always wins —
        // email is free text with no cross-user uniqueness against
        // usernames, so an OR could otherwise match an unrelated account.
        const roleInclude = { role: { include: { rolePermissions: { include: { permission: true } } } } } as const
        const user =
          (await prisma.user.findFirst({ where: { username: identifier }, include: roleInclude })) ??
          (await prisma.user.findFirst({ where: { email: identifier }, include: roleInclude }))
        if (!user || !user.isActive) return null

        const passwordValid = await bcrypt.compare(password, user.passwordHash)
        if (!passwordValid) return null

        // Mint a new session id and make it the account's only valid one — this
        // login immediately supersedes any session already active elsewhere.
        const sessionId = randomUUID()
        await prisma.user.update({ where: { id: user.id }, data: { activeSessionId: sessionId } })

        // Logging in is the attendance sign-in. Close out any record left open
        // by a previous session (e.g. the device that just got superseded, or
        // one that was never cleanly signed out of) before opening a fresh one.
        await prisma.signInRecord.updateMany({
          where: { userId: user.id, signOutAt: null },
          data: { signOutAt: new Date() },
        })
        await prisma.signInRecord.create({ data: { userId: user.id } })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          roleName: user.role.name,
          permissions: user.role.rolePermissions.map((rp) => rp.permission.code),
          department: user.department,
          sessionId,
        }
      },
    }),
  ],
})
