import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/db";
import { userLoginSchema } from "@/lib/validators";

export const authOptions: NextAuthOptions = {
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
        // Validate input with Zod
        const validationResult = userLoginSchema.safeParse(credentials);
        if (!validationResult.success) {
          throw new Error("Le credenziali fornite non sono valide");
        }

        const { email, password } = validationResult.data;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error("Email non trovata");
        }

        if (!user.password) {
          throw new Error("Questo account non ha una password. Usa Google per accedere.");
        }

        // Check password
        const isPasswordValid = await bcryptjs.compare(
          password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Password non corretta");
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
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async signIn(params) {
      const { user, account, profile } = params;
      
      // Handle Google OAuth user creation
      if (account?.provider === "google") {
        // Verify OAuth credentials are configured
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
          console.error("Google OAuth not properly configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
          return false;
        }

        try {
          await prisma.user.upsert({
            where: { googleId: account.providerAccountId },
            update: {
              name: user?.name || undefined,
              email: user?.email || undefined,
              image: user?.image || undefined,
            },
            create: {
              googleId: account.providerAccountId,
              name: user?.name || "",
              email: user?.email || "",
              image: user?.image || undefined,
              role: "CUSTOMER",
            },
          });
        } catch (error) {
          console.error("Error creating/updating Google user:", error);
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
