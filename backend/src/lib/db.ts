import "dotenv/config"
import { Client, Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

// Prisma reads timestamps assuming a UTC session, so our connections always run in UTC, whatever timezone the
// database shows to other tools (the Supabase table editor, psql). The pooler ignores startup options, so the
// timezone is set on each new connection before the pool hands it out.
class UtcClient extends Client {
  // @ts-expect-error pg's Client.connect is overloaded (callback and promise); the pool only uses the callback form
  connect(callback?: (err?: Error) => void) {
    if (!callback) return super.connect().then(() => this.query("SET TIME ZONE 'UTC'")).then(() => undefined)
    super.connect((err?: Error) => {
      if (err) return callback(err)
      this.query("SET TIME ZONE 'UTC'", (setErr: Error | null) => callback(setErr ?? undefined))
    })
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, Client: UtcClient as unknown as typeof Client })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
