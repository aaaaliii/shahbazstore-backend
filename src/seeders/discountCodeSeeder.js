import DiscountCode from '../models/DiscountCode.js';

const seedDiscountCodes = async () => {
  try {
    // Clear existing discount codes
    await DiscountCode.deleteMany({});
    console.log('Cleared existing discount codes');

    const discountCodes = [
      {
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        minPurchase: 50,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        isActive: true
      },
      {
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        minPurchase: 100,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        isActive: true
      },
      {
        code: 'FLAT50',
        type: 'fixed',
        value: 50,
        minPurchase: 200,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
      },
      {
        code: 'SUMMER25',
        type: 'percentage',
        value: 25,
        minPurchase: 150,
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        isActive: true
      },
      {
        code: 'NEWUSER15',
        type: 'percentage',
        value: 15,
        minPurchase: 75,
        expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
        isActive: true
      },
      {
        code: 'EXPIRED',
        type: 'percentage',
        value: 10,
        minPurchase: 50,
        expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Expired 10 days ago
        isActive: false
      }
    ];

    // Insert discount codes
    const createdCodes = await DiscountCode.insertMany(discountCodes);
    console.log(`✅ Seeded ${createdCodes.length} discount codes successfully`);

    // Display created codes
    createdCodes.forEach(code => {
      const discount = code.type === 'percentage' 
        ? `${code.value}%` 
        : `Rs ${code.value}`;
      console.log(`  - ${code.code}: ${discount} off (min purchase: Rs ${code.minPurchase})`);
    });

    return createdCodes;
  } catch (error) {
    console.error('❌ Error seeding discount codes:', error);
    throw error;
  }
};

export default seedDiscountCodes;
