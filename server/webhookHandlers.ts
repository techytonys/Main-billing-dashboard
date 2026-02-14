import { getStripeSync } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    try {
      const { getUncachableStripeClient, getStripeSecretKey } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      let event: any;
      try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (webhookSecret) {
          event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } else {
          event = JSON.parse(payload.toString());
        }
      } catch {
        event = JSON.parse(payload.toString());
      }
      await this.handlePaymentPlanEvents(event);
    } catch (e) {
      console.error("Payment plan webhook processing error:", e);
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  static async handlePaymentPlanEvents(event: any): Promise<void> {
    if (event.type === "checkout.session.completed" && event.data?.object?.mode === "subscription") {
      const session = event.data.object;
      const planId = session.metadata?.paymentPlanId;
      if (planId) {
        const plan = await storage.getPaymentPlan(planId);
        if (plan && plan.status === "pending") {
          await storage.updatePaymentPlan(planId, {
            status: "active",
            stripeSubscriptionId: session.subscription,
            startDate: new Date(),
          });
        }
      }
    }

    if (event.type === "invoice.paid") {
      const stripeInvoice = event.data.object;
      const subscriptionId = stripeInvoice.subscription;
      if (subscriptionId && stripeInvoice.billing_reason !== "subscription_create") {
        const plan = await storage.getPaymentPlanBySubscription(subscriptionId);
        if (plan && plan.status === "active") {
          const newPaid = plan.installmentsPaid + 1;
          const updates: any = { installmentsPaid: newPaid };
          if (newPaid >= plan.numberOfInstallments) {
            updates.status = "completed";
            await storage.updateInvoiceStatus(plan.invoiceId, "paid");
          }
          await storage.updatePaymentPlan(plan.id, updates);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const planId = subscription.metadata?.paymentPlanId;
      if (planId) {
        const plan = await storage.getPaymentPlan(planId);
        if (plan && plan.status === "active") {
          if (plan.installmentsPaid >= plan.numberOfInstallments) {
            await storage.updatePaymentPlan(plan.id, { status: "completed" });
          } else {
            await storage.updatePaymentPlan(plan.id, { status: "cancelled" });
          }
        }
      } else {
        const plan = await storage.getPaymentPlanBySubscription(subscription.id);
        if (plan && plan.status === "active") {
          if (plan.installmentsPaid >= plan.numberOfInstallments) {
            await storage.updatePaymentPlan(plan.id, { status: "completed" });
          } else {
            await storage.updatePaymentPlan(plan.id, { status: "cancelled" });
          }
        }
      }
    }
  }
}
