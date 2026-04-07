import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI!

// Native MongoClient — used by Better Auth internally
export const mongoClient = new MongoClient(uri)

// Mongoose connection — used for app data (questions, sessions, etc.)
export async function connectDB() {
  await mongoClient.connect()
  await mongoose.connect(uri)
  console.log('Connected to MongoDB Atlas')
}
