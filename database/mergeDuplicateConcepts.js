const { mergeDuplicateConcepts } = require('./typeDBUtils');

(async () => {
  try {
    await mergeDuplicateConcepts();
    console.log('Merged duplicate concepts successfully');
  } catch (error) {
    console.error('Error merging duplicate concepts:', error);
  }
})();
