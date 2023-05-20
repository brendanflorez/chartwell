const fs = require('fs');
const { TypeDB, TypeDBClient, SessionType, TransactionType } = require('typedb-client');

async function loadSchema() {
  const client = TypeDB.coreClient('139.144.44.25:1729');
  const schema = fs.readFileSync('./database/schema.gql', 'utf8');

  const session = await client.session('chartwell_01', SessionType.SCHEMA);
  const transaction = await session.transaction(TransactionType.WRITE);

  try {
    await transaction.query.define(schema);
    await transaction.commit();
    console.log('Schema loaded successfully.');
  } catch (err) {
    console.error('Error loading schema:', err);
  } finally {
    await session.close();
  }

  client.close();
}

loadSchema();
