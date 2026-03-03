# Shahbaz Store Backend API

E-commerce backend API built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization (JWT)
- Product management with variants and inventory tracking
- Category management
- Product reviews and ratings
- Wishlist functionality
- Order management
- Discount codes/coupons
- Header links management
- Analytics tracking
- Email notifications
- Search and filtering
- Recently viewed products
- Social sharing support

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Nodemailer for emails
- Joi for validation

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shahbaz-store
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
UPLOAD_PATH=./uploads/products
MAX_FILE_SIZE=5242880
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Elasticsearch (Optional - for advanced search)
ELASTICSEARCH_ENABLED=false
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX_NAME=products
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_SSL=false
```

3. (Optional) Set up Elasticsearch for advanced search:
```bash
# Install and run Elasticsearch (using Docker)
docker run -d --name elasticsearch -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# Or install Elasticsearch locally from https://www.elastic.co/downloads/elasticsearch
```

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

5. (Optional) Reindex existing products for Elasticsearch:
```bash
# After enabling ELASTICSEARCH_ENABLED=true in .env
npm run reindex
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `GET /api/auth/recently-viewed` - Get recently viewed products (protected)
- `POST /api/auth/recently-viewed` - Add to recently viewed (protected)

### Products
- `GET /api/products` - Get all products (with filters, search, pagination)
- `GET /api/products/popular` - Get popular products
- `GET /api/products/compare` - Get products for comparison
- `GET /api/products/:id` - Get single product
- `GET /api/products/:id/related` - Get related products
- `GET /api/products/:id/share-data` - Get social share data
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### Reviews
- `GET /api/reviews/product/:productId` - Get product reviews
- `GET /api/reviews` - Get all reviews (admin only)
- `POST /api/reviews/product/:productId` - Create review (authenticated)
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review
- `POST /api/reviews/:id/helpful` - Mark review as helpful
- `PUT /api/reviews/:id/approve` - Approve review (admin only)

### Wishlist
- `GET /api/wishlist` - Get user wishlist (authenticated)
- `POST /api/wishlist` - Add to wishlist (authenticated)
- `DELETE /api/wishlist/:productId` - Remove from wishlist (authenticated)

### Orders
- `GET /api/orders` - Get user orders (authenticated, supports pagination and status filter)
  - Query params: `page`, `limit`, `status` (pending, confirmed, shipped, delivered, cancelled)
- `GET /api/orders/:id` - Get single order (authenticated)
- `POST /api/orders` - Create order (authenticated)
- `PUT /api/orders/:id/cancel` - Cancel order (authenticated, user can cancel own orders)
- `PUT /api/orders/:id/status` - Update order status (admin only, validates transitions and restores stock on cancellation)

### Discount Codes
- `POST /api/discount-codes/validate` - Validate discount code
- `GET /api/discount-codes` - Get all codes (admin only)
- `GET /api/discount-codes/:id` - Get single code (admin only)
- `POST /api/discount-codes` - Create code (admin only)
- `PUT /api/discount-codes/:id` - Update code (admin only)
- `DELETE /api/discount-codes/:id` - Delete code (admin only)

### Header Links
- `GET /api/header-links` - Get active header links
- `GET /api/header-links/all` - Get all links (admin only)
- `POST /api/header-links` - Create link (admin only)
- `PUT /api/header-links/:id` - Update link (admin only)
- `PUT /api/header-links/reorder` - Reorder links (admin only)
- `DELETE /api/header-links/:id` - Delete link (admin only)

### Analytics
- `POST /api/analytics/track` - Track event
- `GET /api/analytics/popular-products` - Get popular products
- `GET /api/analytics/dashboard` - Get dashboard stats (admin only)

### Upload
- `POST /api/upload/product-image` - Upload product image (admin only)

## Product Variants

Products support variants (e.g., Size, Color) with:
- Different prices per variant option
- Individual stock tracking per variant
- Variant-specific images

Example variant structure:
```json
{
  "Size": [
    {
      "name": "Size",
      "value": "Small",
      "priceModifier": 0,
      "stock": 10,
      "sku": "PROD-SM"
    },
    {
      "name": "Size",
      "value": "Large",
      "priceModifier": 5,
      "stock": 5,
      "sku": "PROD-LG"
    }
  ]
}
```

## Elasticsearch Search

The API supports Elasticsearch for advanced product search capabilities. When enabled, search queries use Elasticsearch for better performance and relevance.

### Features:
- Full-text search with fuzzy matching
- Multi-field search (name, description, tags)
- Advanced filtering (price, rating, stock, category, tags)
- Relevance-based ranking
- Automatic fallback to MongoDB if Elasticsearch is unavailable

### Setup:
1. Set `ELASTICSEARCH_ENABLED=true` in `.env`
2. Configure Elasticsearch connection settings
3. Run `npm run reindex` to index existing products
4. New products are automatically indexed on create/update

### Search Behavior:
- If `ELASTICSEARCH_ENABLED=true` and a search query is provided, Elasticsearch is used
- If Elasticsearch fails or is disabled, the API falls back to MongoDB regex search
- All other filters (category, price, rating, etc.) work with both search methods

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Error Handling

All errors follow this format:
```json
{
  "success": false,
  "status": "error",
  "message": "Error message"
}
```

## License

ISC
