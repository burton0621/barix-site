/*
  Stripe Products API
  -------------------
  Fetches subscription products and their prices from Stripe's product catalog.
  This allows the registration page to dynamically display available plans
  rather than having them hardcoded.
  
  Products should have the following metadata in Stripe:
  - order: Number for sorting (1, 2, 3, etc.)
  - blurb: Short description of the plan
  - features: Comma-separated list of features (e.g., "Unlimited invoices,Team support,Priority email")
  - popular: Set to "true" to highlight as most popular
  
  Returns an array of products sorted by the 'order' metadata field.
*/

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2023-10-16" })
  : null;

export async function GET() {
  try {
    // Make sure Stripe is configured
    if (!stripe) {
      console.error("Stripe not initialized - STRIPE_SECRET_KEY missing");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    // Fetch all active products from Stripe
    // We only want subscription products that are active
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Fetch all active prices to match with products
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
    });

    // Build a map of product ID to its default/recurring price
    // We prefer recurring prices for subscription products
    const priceMap = {};
    for (const price of prices.data) {
      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      
      // If we don't have a price for this product yet, or this one is recurring (preferred)
      if (!priceMap[productId] || price.recurring) {
        priceMap[productId] = price;
      }
    }

    // Transform Stripe products into our plan format
    const plans = products.data
      .filter((product) => {
        // Only include products that have a price and are meant for subscriptions
        // You can filter by metadata if needed (e.g., product.metadata.type === 'subscription')
        return priceMap[product.id];
      })
      .map((product) => {
        const price = priceMap[product.id];
        
        // Parse features from metadata (comma-separated string)
        const featuresString = product.metadata?.features || "";
        const features = featuresString
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f.length > 0);

        // Get the price amount in dollars (Stripe stores in cents)
        const priceAmount = price.unit_amount ? price.unit_amount / 100 : 0;
        
        // Determine billing interval (monthly, yearly, etc.)
        const interval = price.recurring?.interval || "one_time";

        return {
          id: product.id,
          priceId: price.id,
          name: product.name,
          description: product.description || "",
          blurb: product.metadata?.blurb || product.description || "",
          price: priceAmount,
          interval: interval,
          features: features.length > 0 ? features : [
            // Default features if none specified in metadata
            "Access to Barix Billing",
            "Online payments",
            "Invoice management",
          ],
          popular: product.metadata?.popular === "true",
          order: parseInt(product.metadata?.order || "99", 10),
        };
      })
      // Sort by the order metadata field so plans appear in the right sequence
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({
      success: true,
      plans: plans,
    });

  } catch (error) {
    console.error("Error fetching Stripe products:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans: " + error.message },
      { status: 500 }
    );
  }
}

