import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CosmosClient } from "@azure/cosmos";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT || "",
  key: process.env.COSMOS_KEY || "",
});
const usersContainer = cosmosClient.database("mykos").container("users");

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isSignup: { label: "Signup", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        const name = credentials?.name as string;
        const isSignup = credentials?.isSignup === "true";

        if (!email || !password) return null;

        const hashedPassword = hashPassword(password);

        if (isSignup) {
          // Check if user exists
          const { resources } = await usersContainer.items.query({
            query: "SELECT * FROM c WHERE c.email = @email",
            parameters: [{ name: "@email", value: email }],
          }).fetchAll();

          if (resources.length > 0) return null; // User already exists

          // Create user
          const user = {
            id: `user_${Date.now()}`,
            email,
            name: name || email.split("@")[0],
            passwordHash: hashedPassword,
            createdAt: new Date().toISOString(),
          };
          await usersContainer.items.create(user);
          return { id: user.id, email: user.email, name: user.name };
        }

        // Login
        const { resources } = await usersContainer.items.query({
          query: "SELECT * FROM c WHERE c.email = @email AND c.passwordHash = @hash",
          parameters: [
            { name: "@email", value: email },
            { name: "@hash", value: hashedPassword },
          ],
        }).fetchAll();

        if (resources.length === 0) return null;
        const user = resources[0];
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
