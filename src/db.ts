// src/db.ts
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  user: process.env.DB_USER,
  port: +process.env.PORT!,
});

export async function setupDB() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id        SERIAL PRIMARY KEY,
      content   TEXT NOT NULL,           -- the original chunk text
      metadata  JSONB,                   -- filename, page, paragraph etc.
      embedding vector(768)             -- small model = 768 dims
    )
  `);

  // Recreate IVF index with a small list count suitable for a learning dataset.
  await pool.query(`DROP INDEX IF EXISTS documents_embedding_idx`);

  // Index for fast similarity search
  await pool.query(`
    CREATE INDEX documents_embedding_idx
    ON documents
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10)
  `);

}
//The vector(1536) column is pgvector's native type. The ivfflat index is what makes similarity search fast at scale — without it, every query does a full table scan.