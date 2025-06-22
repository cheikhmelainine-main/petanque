import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Étendre l'interface global pour TypeScript
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === 'development') {
  // En développement, utiliser une variable globale pour que la valeur
  // soit préservée à travers les rechargements de modules HMR
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // En production, il est préférable de ne pas utiliser une variable globale
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Exporter une Promise MongoClient singleton
export default clientPromise 