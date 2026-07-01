import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    Credentials({
      name: "Login",
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;

        // 🔥 SIMPLE DEMO LOGIN (replace later with DB users)
        if (username === "admin" && password === "admin") {
          return {
            id: "1",
            name: "admin",
            role: "admin",
          };
        }

        if (username === "user" && password === "user") {
          return {
            id: "2",
            name: "user",
            role: "user",
          };
        }

        return null;
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      (session.user as any).role = token.role;
      return session;
    },
  },
});

export { handler as GET, handler as POST };