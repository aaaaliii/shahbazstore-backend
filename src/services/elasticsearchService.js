import elasticsearchClient from '../config/elasticsearch.js';
import { AppError } from '../utils/errors.js';

const INDEX_NAME = process.env.ELASTICSEARCH_INDEX_NAME || 'products';

// Product index mapping
const productMapping = {
  properties: {
    id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        suggest: { type: 'completion' }
      }
    },
    slug: { type: 'keyword' },
    description: {
      type: 'text',
      analyzer: 'standard'
    },
    shortDescription: {
      type: 'text',
      analyzer: 'standard'
    },
    price: { type: 'float' },
    compareAtPrice: { type: 'float' },
    category: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        name: { type: 'text' },
        slug: { type: 'keyword' }
      }
    },
    images: { type: 'keyword' },
    tags: {
      type: 'text',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    sku: { type: 'keyword' },
    barcode: { type: 'keyword' },
    stock: { type: 'integer' },
    trackInventory: { type: 'boolean' },
    lowStockThreshold: { type: 'integer' },
    isActive: { type: 'boolean' },
    featured: { type: 'boolean' },
    averageRating: { type: 'float' },
    reviewCount: { type: 'integer' },
    viewCount: { type: 'integer' },
    variants: {
      type: 'nested',
      properties: {
        type: { type: 'keyword' },
        value: { type: 'keyword' },
        priceModifier: { type: 'float' },
        stock: { type: 'integer' },
        sku: { type: 'keyword' },
        barcode: { type: 'keyword' }
      }
    },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
  }
};

// Create index if it doesn't exist
export const createIndex = async () => {
  try {
    const exists = await elasticsearchClient.indices.exists({ index: INDEX_NAME });
    
    if (!exists) {
      await elasticsearchClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: productMapping,
          settings: {
            analysis: {
              analyzer: {
                product_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding']
                }
              }
            }
          }
        }
      });
      console.log(`Elasticsearch index "${INDEX_NAME}" created successfully`);
    } else {
      console.log(`Elasticsearch index "${INDEX_NAME}" already exists`);
    }
  } catch (error) {
    console.error('Error creating Elasticsearch index:', error);
    throw error;
  }
};

// Index a product
export const indexProduct = async (product) => {
  try {
    // Convert variants Map to array for Elasticsearch
    const variantsArray = [];
    if (product.variants && product.variants.size > 0) {
      for (const [variantType, variantOptions] of product.variants.entries()) {
        variantOptions.forEach(option => {
          variantsArray.push({
            type: variantType,
            value: option.value,
            priceModifier: option.priceModifier || 0,
            stock: option.stock,
            sku: option.sku,
            barcode: option.barcode
          });
        });
      }
    }

    const document = {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      price: product.price,
      compareAtPrice: product.compareAtPrice || null,
      category: product.category ? {
        id: product.category._id?.toString() || product.category.toString(),
        name: product.category.name || '',
        slug: product.category.slug || ''
      } : null,
      images: product.images || [],
      tags: product.tags || [],
      sku: product.sku || null,
      barcode: product.barcode || null,
      stock: product.stock || 0,
      trackInventory: product.trackInventory !== false,
      lowStockThreshold: product.lowStockThreshold || 10,
      isActive: product.isActive !== false,
      featured: product.featured || false,
      averageRating: product.averageRating || 0,
      reviewCount: product.reviewCount || 0,
      viewCount: product.viewCount || 0,
      variants: variantsArray,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    await elasticsearchClient.index({
      index: INDEX_NAME,
      id: product._id.toString(),
      body: document
    });

    // Refresh index to make document searchable immediately
    await elasticsearchClient.indices.refresh({ index: INDEX_NAME });
  } catch (error) {
    console.error('Error indexing product:', error);
    throw error;
  }
};

// Update a product in the index
export const updateProductIndex = async (product) => {
  try {
    await indexProduct(product);
  } catch (error) {
    console.error('Error updating product index:', error);
    throw error;
  }
};

// Delete a product from the index
export const deleteProductIndex = async (productId) => {
  try {
    await elasticsearchClient.delete({
      index: INDEX_NAME,
      id: productId.toString()
    });
    await elasticsearchClient.indices.refresh({ index: INDEX_NAME });
  } catch (error) {
    // Ignore if document doesn't exist
    if (error.meta?.statusCode !== 404) {
      console.error('Error deleting product from index:', error);
      throw error;
    }
  }
};

// Search products
export const searchProducts = async (searchParams) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      featured,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = searchParams;

    const mustQueries = [];
    const shouldQueries = [];
    const filterQueries = [];

    // Base filter: only active products
    filterQueries.push({ term: { isActive: true } });

    // Search query
    if (search && search.trim()) {
      // Search in product fields and category name
      // Category name is indexed in the product document, so we can search it directly
      mustQueries.push({
        multi_match: {
          query: search.trim(),
          fields: [
            'name^3',                    // Product name (highest weight)
            'description^2',             // Product description
            'shortDescription^2',        // Short description
            'category.name^2',           // Category name (weighted)
            'tags^2'                     // Tags
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or'
        }
      });
    }

    // Category filter - include child categories
    if (category) {
      // Get all descendant category IDs (including the category itself)
      const Category = (await import('../models/Category.js')).default;
      const getAllDescendantIds = async (categoryId) => {
        const categoryIds = [categoryId.toString()];
        const getChildren = async (parentId) => {
          const children = await Category.find({ 
            parent: parentId,
            isActive: true 
          }).select('_id').lean();
          
          for (const child of children) {
            categoryIds.push(child._id.toString());
            await getChildren(child._id); // Recursively get nested children
          }
        };
        
        await getChildren(categoryId);
        return categoryIds;
      };
      
      const categoryIds = await getAllDescendantIds(category);
      filterQueries.push({ terms: { 'category.id': categoryIds } });
    }

    // Price range filter
    if (minPrice !== null && minPrice !== undefined || maxPrice !== null && maxPrice !== undefined) {
      const priceRange = {};
      if (minPrice !== null && minPrice !== undefined) {
        priceRange.gte = minPrice;
      }
      if (maxPrice !== null && maxPrice !== undefined) {
        priceRange.lte = maxPrice;
      }
      filterQueries.push({ range: { price: priceRange } });
    }

    // Rating filter
    if (minRating !== null && minRating !== undefined) {
      filterQueries.push({ range: { averageRating: { gte: minRating } } });
    }

    // Stock filter
    if (inStock === 'true' || inStock === true) {
      filterQueries.push({
        bool: {
          should: [
            { range: { stock: { gt: 0 } } },
            { exists: { field: 'variants' } }
          ],
          minimum_should_match: 1
        }
      });
    }

    // Featured filter
    if (featured === 'true' || featured === true) {
      filterQueries.push({ term: { featured: true } });
    }

    // Tags filter
    if (tags && Array.isArray(tags) && tags.length > 0) {
      filterQueries.push({
        terms: { 'tags.keyword': tags }
      });
    }

    // Build query
    const query = {
      bool: {
        must: mustQueries.length > 0 ? mustQueries : undefined,
        should: shouldQueries.length > 0 ? shouldQueries : undefined,
        filter: filterQueries.length > 0 ? filterQueries : undefined,
        minimum_should_match: shouldQueries.length > 0 ? 1 : undefined
      }
    };

    // Sort options
    const sortOptions = [];
    const sortFieldMap = {
      createdAt: 'createdAt',
      name: 'name.keyword',
      price: 'price',
      averageRating: 'averageRating',
      viewCount: 'viewCount'
    };

    const sortField = sortFieldMap[sortBy] || 'createdAt';
    sortOptions.push({
      [sortField]: {
        order: sortOrder === 'asc' ? 'asc' : 'desc'
      }
    });

    // Execute search
    const from = (page - 1) * limit;
    const response = await elasticsearchClient.search({
      index: INDEX_NAME,
      query,
      sort: sortOptions,
      from,
      size: limit
    });

    // Extract results (Elasticsearch v8 returns response directly)
    const hits = response.hits || { hits: [], total: { value: 0 } };
    const products = hits.hits.map(hit => ({
      _id: hit._id,
      _score: hit._score,
      ...hit._source
    }));

    // Handle total count (can be object with value or number)
    const total = typeof hits.total === 'object' ? (hits.total.value || 0) : (hits.total || 0);

    return {
      products,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Elasticsearch search error:', error);
    throw new AppError('Search failed', 500);
  }
};

// Bulk index products
export const bulkIndexProducts = async (products) => {
  try {
    const body = [];
    
    for (const product of products) {
      // Convert variants Map to array
      const variantsArray = [];
      if (product.variants && product.variants.size > 0) {
        for (const [variantType, variantOptions] of product.variants.entries()) {
          variantOptions.forEach(option => {
            variantsArray.push({
              type: variantType,
              value: option.value,
              priceModifier: option.priceModifier || 0,
              stock: option.stock,
              sku: option.sku,
              barcode: option.barcode
            });
          });
        }
      }

      const document = {
        id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        price: product.price,
        compareAtPrice: product.compareAtPrice || null,
        category: product.category ? {
          id: product.category._id?.toString() || product.category.toString(),
          name: product.category.name || '',
          slug: product.category.slug || ''
        } : null,
        images: product.images || [],
        tags: product.tags || [],
        sku: product.sku || null,
        barcode: product.barcode || null,
        stock: product.stock || 0,
        trackInventory: product.trackInventory !== false,
        lowStockThreshold: product.lowStockThreshold || 10,
        isActive: product.isActive !== false,
        featured: product.featured || false,
        averageRating: product.averageRating || 0,
        reviewCount: product.reviewCount || 0,
        viewCount: product.viewCount || 0,
        variants: variantsArray,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      };

      body.push({ index: { _index: INDEX_NAME, _id: product._id.toString() } });
      body.push(document);
    }

    if (body.length > 0) {
      const response = await elasticsearchClient.bulk({ body });
      if (response.errors) {
        console.error('Bulk index errors:', response.items.filter(item => item.index?.error));
      }
      await elasticsearchClient.indices.refresh({ index: INDEX_NAME });
      return (response.items?.length || 0) / 2; // Divide by 2 because each product has 2 items (action + document)
    }

    return 0;
  } catch (error) {
    console.error('Error bulk indexing products:', error);
    throw error;
  }
};

// Get index stats
export const getIndexStats = async () => {
  try {
    const stats = await elasticsearchClient.count({ index: INDEX_NAME });
    return {
      totalDocuments: stats.count || 0
    };
  } catch (error) {
    console.error('Error getting index stats:', error);
    return { totalDocuments: 0 };
  }
};
