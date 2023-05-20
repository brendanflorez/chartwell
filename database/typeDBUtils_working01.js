const { TypeDB, TypeDBClient, SessionType, TransactionType } = require("typedb-client");

const connectToDatabase = async () => {
  const client = TypeDB.coreClient("139.144.44.25:1729");
  const session = await client.session("chartwell_01", SessionType.DATA);
  return { client, session };
};

const executeInsertQuery = async (query) => {
  const { client, session } = await connectToDatabase();
  const transaction = await session.transaction(TransactionType.WRITE);

  try {
    const insertStream = await transaction.query.insert(query);
    const conceptMaps = await insertStream.collect();
    await transaction.commit();
    return conceptMaps;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await transaction.close();
    await session.close();
    await client.close();
  }
};



const mergeDuplicateConcepts = async () => {
  const { client, session } = await connectToDatabase();
  const transaction = await session.transaction(TransactionType.WRITE);

  try {
    // Find all concepts with duplicate names and store their IIDs
    const findDuplicatesQuery = `
      match
        $c1 isa concept, has name $n;
        $c2 isa concept, has name $n;
        not { $c1 is $c2; };
      get $c1, $c2, $n;
    `;
    const duplicatesStream = await transaction.query.match(findDuplicatesQuery);
    const duplicates = await duplicatesStream.collect();

    // Store the results in a nested JavaScript array
    const duplicateSets = {};

    duplicates.forEach((duplicate) => {
      const c1 = duplicate.get("c1");
      const c2 = duplicate.get("c2");
      const name = duplicate.get("n").value;

      if (!duplicateSets[name]) {
        duplicateSets[name] = new Set();
      }

      duplicateSets[name].add(c1.iid);
      duplicateSets[name].add(c2.iid);
    });

    // For each set of concepts with the same name, select the first one as the main concept
    // and merge the attributes of the others into it
    for (const name in duplicateSets) {
      const iids = Array.from(duplicateSets[name]);
      const mainConceptIID = iids.shift();

      for (const duplicateIID of iids) {
        // Update the causality relationships of each non-main concept to point to the main concept
        const updateCausalityRelationships = `
          match
            $relation (cause: $duplicate, effect: $other) isa causality;
            $main iid ${mainConceptIID};
            $duplicate iid ${duplicateIID};
          insert
            $new_relation (cause: $main, effect: $other) isa causality;
        `;
        await transaction.query.insert(updateCausalityRelationships);

        // Update the similarity relationships of each non-main concept to point to the main concept
        const updateSimilarityRelationships = `
          match
            $relation (concept-1: $duplicate, concept-2: $other) isa similarity;
            $main iid ${mainConceptIID};
            $duplicate iid ${duplicateIID};
          insert
            $new_relation (concept-1: $main, concept-2: $other) isa similarity;
        `;
        await transaction.query.insert(updateSimilarityRelationships);

        // Update the similarity relationships where the non-main concept is concept-2
        const updateSimilarityRelationshipsInverse = `
          match
            $relation (concept-1: $other, concept-2: $duplicate) isa similarity;
            $main iid ${mainConceptIID};
            $duplicate iid ${duplicateIID};
          insert
            $new_relation (concept-1: $other, concept-2: $main) isa similarity;
        `;
        await transaction.query.insert(updateSimilarityRelationshipsInverse);

        // Delete the non-main concepts after the relationships have been updated
        const deleteDuplicateConceptQuery = `
          match $duplicate iid ${duplicateIID}; delete $duplicate isa concept;
        `;
        await transaction.query.delete(deleteDuplicateConceptQuery);
      }
    }

    // Delete causality relations without two connected concepts
    const deleteInvalidCausalityRelations = `
      match
        $relation isa causality;
        not {
          $relation (cause: $concept1, effect: $concept2);
        };
      delete $relation isa causality;
    `;
    await transaction.query.delete(deleteInvalidCausalityRelations);

    // Delete attributes that are not connected to any entities
    const deleteDisconnectedAttributes = `
      match
        $attr isa attribute;
        not {
          $entity has $attr;
        };
      delete $attr isa attribute;
    `;
    await transaction.query.delete(deleteDisconnectedAttributes);

    // Commit the transaction
    await transaction.commit();
  } catch (error) {
    console.error(error);
  } finally {
    await transaction.close();
    await session.close();
    await client.close();
  }
};

       


module.exports = {
  connectToDatabase,
  executeInsertQuery,
  mergeDuplicateConcepts,
};
