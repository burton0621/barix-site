/*
  Stripe Connect Webhook Handler
  ------------------------------
  Handles webhook events from Stripe related to connected accounts.
  This is separate from the regular payment webhook because Connect
  events have different signatures and purposes.

  Key events we handle:
  - account.updated: When a connected account's status changes (verification complete, etc.)
  - payout.paid: When a payout to a contractor's bank succeeds
  - payout.failed: When a payout fails (insufficient funds, bank issue, etc.)

  Configure this webhook in Stripe Dashboard:
  Developers > Webhooks > Add endpoint
  URL: https://yourdomain.com/api/stripe/connect-webhook
  Listen to: Events on Connected Accounts
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // Verify the webhook signature using the Connect webhook secret
    // This ensures the request actually came from Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET ||
          process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(
        "Connect webhook signature verification failed:",
        err.message
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("Connect webhook received:", event.type);

    // Handle different event types
    switch (event.type) {
      // Account status changed - this is the main event we care about
      // Fires when verification completes, requirements change, etc.
      case "account.updated": {
        const account = event.data.object;
        console.log("Account updated:", account.id, {
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
        });

        // Update our database with the new status
        const { error: updateError } = await supabaseAdmin
          .from("contractor_profiles")
          .update({
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_charges_enabled: account.charges_enabled,
            stripe_requirements: account.requirements,
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          console.error("Error updating contractor status:", updateError);
        } else {
          console.log(
            "Updated contractor payout status for account:",
            account.id
          );
        }
        break;
      }

      // Payout to contractor's bank was successful
      case "payout.paid": {
        const payout = event.data.object;
        console.log("Payout successful:", {
          amount: payout.amount / 100,
          account: event.account,
        });
        // You could log this to a payouts table or send a notification
        break;
      }

      // Payout to contractor's bank failed
      case "payout.failed": {
        const payout = event.data.object;
        console.error("Payout failed:", {
          amount: payout.amount / 100,
          account: event.account,
          failure_code: payout.failure_code,
          failure_message: payout.failure_message,
        });
        // You could notify the contractor or admin about the failure
        break;
      }

      // Account was deauthorized (contractor disconnected their account)
      case "account.application.deauthorized": {
        const account = event.data.object;
        console.log("Account deauthorized:", account.id);

        // Clear the Stripe connection from our database
        const { error: updateError } = await supabaseAdmin
          .from("contractor_profiles")
          .update({
            stripe_account_id: null,
            stripe_payouts_enabled: false,
            stripe_charges_enabled: false,
            stripe_requirements: null,
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          console.error("Error clearing contractor Stripe data:", updateError);
        }
        break;
      }

      // ============================================
      // CHECKOUT SESSION COMPLETED - Subscription Mode
      // Fires when customer completes subscription checkout
      // ============================================
      case "checkout.session.completed": {
        const session = event.data.object;

        // Only handle subscription checkouts (ignore payment mode)
        if (session.mode === "subscription" && session.metadata?.contract_id) {
          const contractId = session.metadata.contract_id;
          const subscriptionId = session.subscription;

          console.log("Subscription checkout completed:", {
            contractId,
            subscriptionId,
          });

          // Fetch the subscription to get current period end
          try {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId,
              { stripeAccount: event.account }
            );

            // Update the contract with subscription details
            const { error: updateError } = await supabaseAdmin
              .from("recurring_contracts")
              .update({
                status: "active",
                stripe_subscription_id: subscriptionId,
                activated_at: new Date().toISOString(),
                next_billing_date: new Date(
                  subscription.current_period_end * 1000
                ).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", contractId);

            if (updateError) {
              console.error("Error updating contract:", updateError);
            } else {
              console.log("Activated contract:", contractId);
            }
          } catch (err) {
            console.error(
              "Error retrieving subscription details:",
              err.message
            );
          }
        }
        break;
      }

      // ============================================
      // INVOICE PAYMENT SUCCEEDED - Recurring Payment
      // Fires when a recurring subscription payment succeeds
      // ============================================
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;

        // Only handle subscription invoices
        if (invoice.subscription) {
          console.log("Subscription payment succeeded:", {
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription,
            amount: invoice.amount_paid / 100,
          });

          try {
            // Find the contract by subscription ID
            const { data: contract, error: contractError } =
              await supabaseAdmin
                .from("recurring_contracts")
                .select("*")
                .eq("stripe_subscription_id", invoice.subscription)
                .single();

            if (contractError || !contract) {
              console.warn("Contract not found for subscription:", invoice.subscription);
              break;
            }

            // Guard against duplicate invoices
            const { data: existingInvoice } = await supabaseAdmin
              .from("invoices")
              .select("id")
              .eq("stripe_invoice_id", invoice.id)
              .single();

            if (existingInvoice) {
              console.log("Invoice already exists:", invoice.id);
              break;
            }

            // Create invoice record for the recurring payment
            const invoiceNumber = `REC-${contract.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;

            const { data: newInvoice, error: insertError } =
              await supabaseAdmin
                .from("invoices")
                .insert([
                  {
                    owner_id: contract.owner_id,
                    client_id: contract.client_id,
                    contract_id: contract.id,
                    invoice_number: invoiceNumber,
                    status: "paid",
                    total: contract.amount,
                    paid_at: new Date().toISOString(),
                    issue_date: new Date().toISOString().split("T")[0],
                    due_date: new Date().toISOString().split("T")[0],
                    stripe_invoice_id: invoice.id,
                    document_type: "invoice",
                  },
                ])
                .select()
                .single();

            if (insertError) {
              console.error("Error creating invoice:", insertError);
              break;
            }

            // Create line item
            const { error: lineItemError } = await supabaseAdmin
              .from("invoice_line_items")
              .insert([
                {
                  invoice_id: newInvoice.id,
                  name: contract.title,
                  description: contract.description,
                  quantity: 1,
                  rate: contract.amount,
                  line_total: contract.amount,
                  position: 0,
                },
              ]);

            if (lineItemError) {
              console.error("Error creating line item:", lineItemError);
            }

            // Update contract next_billing_date
            const { error: contractUpdateError } = await supabaseAdmin
              .from("recurring_contracts")
              .update({
                next_billing_date: new Date(
                  invoice.lines.data[0].period.end * 1000
                ).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", contract.id);

            if (contractUpdateError) {
              console.error("Error updating contract billing date:", contractUpdateError);
            } else {
              console.log("Created recurring invoice:", newInvoice.id);
            }
          } catch (err) {
            console.error("Error processing payment_succeeded:", err.message);
          }
        }
        break;
      }

      // ============================================
      // INVOICE PAYMENT FAILED - Dunning Event
      // Fires when subscription payment fails
      // ============================================
      case "invoice.payment_failed": {
        const invoice = event.data.object;

        // Only handle subscription invoices
        if (invoice.subscription) {
          console.log("Subscription payment failed:", {
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription,
          });

          try {
            // Find the contract and update status
            const { data: contract } = await supabaseAdmin
              .from("recurring_contracts")
              .select("*")
              .eq("stripe_subscription_id", invoice.subscription)
              .single();

            if (contract) {
              const { error: updateError } = await supabaseAdmin
                .from("recurring_contracts")
                .update({
                  status: "payment_failed",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", contract.id);

              if (updateError) {
                console.error("Error updating contract status:", updateError);
              } else {
                console.log("Marked contract as payment_failed:", contract.id);
              }
            }
          } catch (err) {
            console.error("Error processing payment_failed:", err.message);
          }
        }
        break;
      }

      // ============================================
      // CUSTOMER SUBSCRIPTION DELETED
      // Fires when subscription is canceled (via cancel_at or explicit cancel)
      // ============================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        console.log("Subscription deleted:", subscription.id);

        try {
          // Find the contract
          const { data: contract } = await supabaseAdmin
            .from("recurring_contracts")
            .select("*")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (contract) {
            // Determine status: expired if cancel_at was set (auto-canceled), canceled if manual
            const status = subscription.cancel_at ? "expired" : "canceled";

            const { error: updateError } = await supabaseAdmin
              .from("recurring_contracts")
              .update({
                status: status,
                canceled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", contract.id);

            if (updateError) {
              console.error("Error updating contract status:", updateError);
            } else {
              console.log(`Marked contract as ${status}:`, contract.id);
            }
          }
        } catch (err) {
          console.error("Error processing subscription.deleted:", err.message);
        }
        break;
      }

      // ============================================
      // CUSTOMER SUBSCRIPTION UPDATED
      // Fires when subscription status changes (e.g., trial ends, past_due)
      // ============================================
      case "customer.subscription.updated": {
        const subscription = event.data.object;

        console.log("Subscription updated:", {
          id: subscription.id,
          status: subscription.status,
        });

        try {
          // Find the contract
          const { data: contract } = await supabaseAdmin
            .from("recurring_contracts")
            .select("*")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (contract) {
            const updates = {
              next_billing_date: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            };

            // If subscription is past_due, update contract status
            if (subscription.status === "past_due") {
              updates.status = "payment_failed";
            }

            const { error: updateError } = await supabaseAdmin
              .from("recurring_contracts")
              .update(updates)
              .eq("id", contract.id);

            if (updateError) {
              console.error("Error updating contract:", updateError);
            } else {
              console.log("Updated contract subscription info:", contract.id);
            }
          }
        } catch (err) {
          console.error("Error processing subscription.updated:", err.message);
        }
        break;
      }

      default:
        // Log unhandled events for debugging, but don't error
        console.log("Unhandled Connect webhook event:", event.type);
    }

    // Always return 200 to acknowledge receipt
    // If we return an error, Stripe will retry the webhook
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Connect webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
