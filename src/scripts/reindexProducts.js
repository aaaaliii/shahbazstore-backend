import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Product from '../models/Product.js';
import { createIndex, bulkIndexProducts, getIndexStats } from '../services/elasticsearchService.js';
import { testConnection } from '../config/elasticsearch.js';

dotenv.config();

const reindexProducts = async () => {
  try {
    console.log('Starting product reindexing...');

    // Check if Elasticsearch is enabled
    if (process.env.ELASTICSEARCH_ENABLED !== 'true') {
      console.log('Elasticsearch is not enabled. Set ELASTICSEARCH_ENABLED=true to use Elasticsearch.');
      process.exit(0);
    }

    // Test Elasticsearch connection
    console.log('Testing Elasticsearch connection...');
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to Elasticsearch. Please check your configuration.');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectDB();

    // Create index if it doesn't exist
    console.log('Creating/verifying Elasticsearch index...');
    await createIndex();

    // Fetch all active products with category populated
    console.log('Fetching products from MongoDB...');
    const products = await Product.find({ isActive: true })
      .populate('category', 'name slug')
      .lean();

    console.log(`Found ${products.length} products to index`);

    if (products.length === 0) {
      console.log('No products to index.');
      process.exit(0);
    }

    // Bulk index products in batches
    const batchSize = 100;
    let indexed = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const count = await bulkIndexProducts(batch);
      indexed += count;
      console.log(`Indexed ${indexed}/${products.length} products...`);
    }

    // Get index stats
    const stats = await getIndexStats();
    console.log(`\nReindexing completed!`);
    console.log(`Total documents in index: ${stats.totalDocuments}`);

    process.exit(0);
  } catch (error) {
    console.error('Error during reindexing:', error);
    process.exit(1);
  }
};

reindexProducts();
