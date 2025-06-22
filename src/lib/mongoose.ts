import mongoose from 'mongoose'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI manquant dans les variables d\'environnement')
}

const MONGODB_URI = process.env.MONGODB_URI

// Étendre l'interface global pour TypeScript
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: any;
    promise: any;
  }
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB 