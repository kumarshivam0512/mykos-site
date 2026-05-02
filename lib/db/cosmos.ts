import { CosmosClient, Database, Container } from "@azure/cosmos";

let client: CosmosClient | null = null;
let database: Database | null = null;
let campaignsContainer: Container | null = null;

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    if (!endpoint || !key) throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

function getDatabase(): Database {
  if (!database) {
    database = getClient().database("mykos");
  }
  return database;
}

export function getCampaignsContainer(): Container {
  if (!campaignsContainer) {
    campaignsContainer = getDatabase().container("campaigns");
  }
  return campaignsContainer;
}
