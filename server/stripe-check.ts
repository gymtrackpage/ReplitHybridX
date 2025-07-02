
import Stripe from 'stripe';

const PRICE_ID = 'price_1RgOOZGKLIEfAkDGfqPezReg';

async function validateStripeIntegration() {
  console.log('🔍 Validating Stripe Integration...\n');
  
  const results = {
    secretKey: false,
    webhookSecret: false,
    priceId: false,
    errors: [] as string[]
  };

  // Check secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    results.errors.push('❌ STRIPE_SECRET_KEY not configured');
  } else {
    console.log('✅ STRIPE_SECRET_KEY configured');
    results.secretKey = true;
  }

  // Check webhook secret
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    results.errors.push('❌ STRIPE_WEBHOOK_SECRET not configured');
  } else {
    console.log('✅ STRIPE_WEBHOOK_SECRET configured');
    results.webhookSecret = true;
  }

  // Validate Stripe connection and price ID
  if (results.secretKey) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // Test API connection
      await stripe.customers.list({ limit: 1 });
      console.log('✅ Stripe API connection successful');

      // Validate price ID
      try {
        const price = await stripe.prices.retrieve(PRICE_ID);
        console.log('✅ Price ID valid:', {
          id: price.id,
          amount: `${(price.unit_amount || 0) / 100} ${price.currency.toUpperCase()}`,
          recurring: price.recurring?.interval || 'one-time',
          active: price.active
        });
        results.priceId = true;

        // Check if price is active
        if (!price.active) {
          results.errors.push(`⚠️  Price ${PRICE_ID} is inactive in Stripe`);
        }
      } catch (priceError: any) {
        results.errors.push(`❌ Price ID ${PRICE_ID} not found in Stripe`);
        console.error('Price validation error:', priceError.message);
      }

    } catch (stripeError: any) {
      results.errors.push('❌ Stripe API connection failed');
      console.error('Stripe connection error:', stripeError.message);
    }
  }

  // Summary
  console.log('\n📋 Validation Summary:');
  console.log(`Secret Key: ${results.secretKey ? '✅' : '❌'}`);
  console.log(`Webhook Secret: ${results.webhookSecret ? '✅' : '❌'}`);
  console.log(`Price ID: ${results.priceId ? '✅' : '❌'}`);

  if (results.errors.length > 0) {
    console.log('\n🚨 Issues found:');
    results.errors.forEach(error => console.log(error));
    console.log('\n⚠️  Please fix these issues before deploying!');
    process.exit(1);
  } else {
    console.log('\n🎉 All Stripe integration checks passed!');
    console.log('✅ Ready for deployment');
  }
}

// Run validation
validateStripeIntegration().catch(error => {
  console.error('Validation script error:', error);
  process.exit(1);
});
