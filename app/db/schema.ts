// app/db/schema.ts
import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }), // null for Google users
  googleId: varchar("google_id", { length: 255 }),         // null for email users
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
});

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  linkedAccountId: integer("linked_account_id").notNull().references(() => linkedAccounts.id),
  categoryId: integer("category_id").references(() => categories.id),
  gmailId: varchar("gmail_id", { length: 255 }).notNull(),
  subject: text("subject"),
  from: varchar("from", { length: 255 }),
  rawHtml: text("raw_html"),
  summary: text("summary"),
  receivedAt: timestamp("received_at"),
});

export const linkedAccounts = pgTable("linked_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gmailId: varchar("gmail_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
});

