import { Client } from '@elastic/elasticsearch';

const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD
    ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      }
    : undefined,
  ssl: process.env.ELASTICSEARCH_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
});

// Test connection
export const testConnection = async () => {
  try {
    const health = await elasticsearchClient.cluster.health();
    console.log('Elasticsearch connected:', health.status);
    return true;
  } catch (error) {
    console.error('Elasticsearch connection error:', error.message);
    return false;
  }
};

export default elasticsearchClient;
