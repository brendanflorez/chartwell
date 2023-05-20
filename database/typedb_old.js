const { TypeDB, TypeDBClient } = require('typedb-client');

const createClient = () => {
  const client = new TypeDBClient(TypeDB.DEFAULT_ADDRESS);
  return client;
};

module.exports = createClient;
