import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions = {
  // Note: PrismaAdapter removed due to conflicts with CredentialsProvider
  // Manual user management implemented in callbacks instead
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("No user found with this email or password not set");
        }

        // Check password
        const isPasswordValid = await bcryptjs.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: any; account: any; profile: any }) {
      // Handle Google OAuth user creation
      if (account?.provider === "google") {
        try {
          await prisma.user.upsert({
            where: { googleId: account.providerAccountId },
            update: {
              name: user.name,
              email: user.email,
              image: user.image,
            },
            create: {
              googleId: account.providerAccountId,
              name: user.name,
              email: user.email,
              image: user.image,
              role: "CUSTOMER",
            },
          });
        } catch (error) {
          console.error("Error creating Google user:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user, account }: { token: any; user: any; account: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // For Google OAuth, get user data from database
      if (account?.provider === "google" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { googleId: token.sub },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },
  },
};

export default NextAuth(authOptions);
