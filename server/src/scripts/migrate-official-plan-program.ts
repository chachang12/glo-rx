#!/usr/bin/env tsx
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { QuestionBankModel } from '../features/learn/exam/exam.model.js'
import { UserModel } from '../features/shared/user/user.model.js'
import { PlanDocumentModel } from '../features/learn/custom-plan/plan-document.model.js'

// Idempotent migration for the Official Plan Program (Phase 0).
//
// Tasks:
//   1. Backfill QuestionBankModel: status='published' if missing,
//      releaseId=null, approvalCount=0, rejectionCount=0, votes=[].
//   2. Backfill UserModel: examAccess=[] and contributor=null if missing.
//   3. Backfill PlanDocumentModel: corpusSource='custom' if missing
//      (existing user-uploaded docs predate the field).
//
// Schema defaults already handle these on next write, but explicit backfill
// makes existing-doc queries that filter on the new fields work
// immediately without waiting for natural touches.
//
// Safe to run multiple times — each step only touches docs missing the
// target field.

interface MigrationReport {
  questionsTouched: number
  usersTouched: number
  documentsTouched: number
}

export async function runMigration(): Promise<MigrationReport> {
  const report: MigrationReport = {
    questionsTouched: 0,
    usersTouched: 0,
    documentsTouched: 0,
  }

  const questionsResult = await QuestionBankModel.updateMany(
    { status: { $exists: false } },
    {
      $set: {
        status: 'published',
        releaseId: null,
        approvalCount: 0,
        rejectionCount: 0,
        rejectionReason: null,
        votes: [],
        publishedAt: null,
        corpusVersion: null,
      },
    }
  )
  report.questionsTouched = questionsResult.modifiedCount

  const usersResult = await UserModel.updateMany(
    { $or: [{ examAccess: { $exists: false } }, { contributor: { $exists: false } }] },
    {
      $set: {
        examAccess: [],
        contributor: null,
      },
    }
  )
  report.usersTouched = usersResult.modifiedCount

  const documentsResult = await PlanDocumentModel.updateMany(
    { corpusSource: { $exists: false } },
    {
      $set: {
        corpusSource: 'custom',
        examCode: null,
        corpusVersion: null,
        fileHash: null,
        filePath: null,
        role: 'source',
      },
    }
  )
  report.documentsTouched = documentsResult.modifiedCount

  return report
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set; cannot migrate.')
  }
  await connectDB()
  try {
    const report = await runMigration()
    console.log(
      `[migrate:opp] done: questions=${report.questionsTouched} users=${report.usersTouched} documents=${report.documentsTouched}`
    )
  } finally {
    await mongoose.disconnect()
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (invokedDirectly) {
  main().catch((err) => {
    console.error('[migrate:opp] failed:', err.message)
    process.exitCode = 1
  })
}
