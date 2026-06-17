#!/usr/bin/env tsx
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB, mongoClient } from '../config/db.js'
import { UserModel } from '../features/shared/user/user.model.js'

// One-shot reconciliation for accounts where BetterAuth wrote a `user` row
// but no domain UserModel row was ever created. The cause was usually the
// app's first authenticated request never landing — historical 404s in the
// SPA rewrite, redirect failures, etc. The hook + middleware-upsert added
// alongside this script prevent it going forward; this script heals any
// pre-existing orphans.
//
// Safe to run multiple times — uses upsert, so existing rows are untouched.

interface BackfillReport {
  authUsersScanned: number
  alreadyLinked: number
  created: number
  failures: Array<{ authId: string; reason: string }>
}

function splitName(name: string | null | undefined): [string, string] {
  const [first = '', last = ''] = (name ?? '').trim().split(' ', 2)
  return [first, last]
}

async function backfillAppUsers(): Promise<BackfillReport> {
  const report: BackfillReport = {
    authUsersScanned: 0,
    alreadyLinked: 0,
    created: 0,
    failures: [],
  }

  // BetterAuth's mongo adapter writes auth users to the singular `user`
  // collection on the same DB. Read directly via the native driver so we
  // don't have to define a Mongoose model for BetterAuth's schema.
  const authUsers = await mongoClient
    .db()
    .collection('user')
    .find({}, { projection: { _id: 1, name: 1 } })
    .toArray()

  report.authUsersScanned = authUsers.length

  for (const authUser of authUsers) {
    const authId = String(authUser._id)
    try {
      const existing = await UserModel.exists({ authId })
      if (existing) {
        report.alreadyLinked += 1
        continue
      }

      const [firstName, lastName] = splitName(
        typeof authUser.name === 'string' ? authUser.name : null
      )

      await UserModel.updateOne(
        { authId },
        { $setOnInsert: { authId, firstName, lastName } },
        { upsert: true }
      )
      report.created += 1
      console.log(`Created UserModel row for ${authId} (${firstName} ${lastName})`)
    } catch (err) {
      report.failures.push({
        authId,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return report
}

async function main() {
  await connectDB()
  try {
    const report = await backfillAppUsers()
    console.log('\n── Backfill report ──')
    console.log(`Auth users scanned : ${report.authUsersScanned}`)
    console.log(`Already linked     : ${report.alreadyLinked}`)
    console.log(`Created            : ${report.created}`)
    console.log(`Failures           : ${report.failures.length}`)
    if (report.failures.length > 0) {
      for (const f of report.failures) {
        console.log(`  - ${f.authId}: ${f.reason}`)
      }
      process.exitCode = 1
    }
  } finally {
    await mongoose.disconnect()
    await mongoClient.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
