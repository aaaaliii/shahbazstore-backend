export const orderConfirmationTemplate = (order) => {
  const orderId = order._id || order.id || 'N/A';
  const totalAmount = (order.totalAmount || 0).toFixed(2);
  const status = order.status || 'pending';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .order-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Thank you for your order!</p>
          <div class="order-details">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Total Amount:</strong> Rs ${totalAmount}</p>
            <p><strong>Status:</strong> ${status}</p>
          </div>
        </div>
        <div class="footer">
          <p>Shahbaz Store</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const restockAlertTemplate = (product, user) => {
  const userName = user?.name || 'Customer';
  const productName = product?.name || 'Product';
  const productPrice = (product?.price || 0).toFixed(2);
  const productSlug = product?.slug || product?._id || '';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .product-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Product Back in Stock!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Great news! The product you were interested in is now back in stock.</p>
          <div class="product-details">
            <h3>${productName}</h3>
            <p><strong>Price:</strong> Rs ${productPrice}</p>
            <a href="${frontendUrl}/products/${productSlug}" class="button">View Product</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const welcomeEmailTemplate = (user) => {
  const userName = user?.name || 'Customer';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Shahbaz Store!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for joining us! We're excited to have you as part of our community.</p>
          <p>Start shopping and discover amazing products.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
