import { CosmosClient, Database, Container } from "@azure/cosmos";

let client: CosmosClient | null = null;
let database: Database | null = null;
let dbReady = false;

// Container cache
const containers: Record<string, Container> = {};

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    if (!endpoint || !key) throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

// Auto-create database if it doesn't exist
async function ensureDatabase(): Promise<Database> {
  if (database && dbReady) return database;
  const { database: db } = await getClient().databases.createIfNotExists({ id: "mykos" });
  database = db;
  dbReady = true;
  return db;
}

// Container definitions: name → partition key
const CONTAINER_DEFS: Record<string, string> = {
  campaigns: "/brandName",
  analytics: "/channel",
  characters: "/brandName",
  locations: "/brandName",
  users: "/email",
  brands: "/userId",
};

// Auto-create container if it doesn't exist, then cache it
async function ensureContainer(name: string): Promise<Container> {
  if (containers[name]) return containers[name];
  const db = await ensureDatabase();
  const partitionKey = CONTAINER_DEFS[name] || "/id";
  const { container } = await db.containers.createIfNotExists({
    id: name,
    partitionKey: { paths: [partitionKey] },
  });
  containers[name] = container;
  return container;
}

// ─── Public getters (auto-create on first use) ──────────────────

export function getCampaignsContainer(): Promise<Container> {
  return ensureContainer("campaigns");
}

export function getAnalyticsContainer(): Promise<Container> {
  return ensureContainer("analytics");
}

export function getCharactersContainer(): Promise<Container> {
  return ensureContainer("characters");
}

export function getLocationsContainer(): Promise<Container> {
  return ensureContainer("locations");
}

export function getUsersContainer(): Promise<Container> {
  return ensureContainer("users");
}

export function getBrandsContainer(): Promise<Container> {
  return ensureContainer("brands");
}
