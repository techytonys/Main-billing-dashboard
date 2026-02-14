import { db } from "./db";
import { customers, projects, billingRates, workEntries, invoices, invoiceLineItems, paymentMethods } from "@shared/schema";

export async function seedDatabase() {
  try {
    const existingCustomers = await db.select().from(customers).limit(1);
    if (existingCustomers.length > 0) {
      return;
    }
  } catch {
    return;
  }

  console.log("Seeding database with demo data...");

  const [customer1] = await db.insert(customers).values({
    name: "Sarah Mitchell",
    email: "sarah@mitchellrestaurant.com",
    company: "Mitchell's Restaurant",
    phone: "(555) 234-5678",
    currency: "USD",
    notes: "Restaurant website redesign project",
  }).returning();

  const [customer2] = await db.insert(customers).values({
    name: "David Chen",
    email: "david@chenlaw.com",
    company: "Chen & Associates Law",
    phone: "(555) 876-5432",
    currency: "USD",
    notes: "Law firm website with contact forms",
  }).returning();

  const [customer3] = await db.insert(customers).values({
    name: "Emily Rodriguez",
    email: "emily@urbanfitness.co",
    company: "Urban Fitness Studio",
    phone: "(555) 345-6789",
    currency: "USD",
  }).returning();

  const [project1] = await db.insert(projects).values({
    customerId: customer1.id,
    name: "Restaurant Website Redesign",
    description: "Full redesign with online ordering integration",
    status: "active",
  }).returning();

  const [project2] = await db.insert(projects).values({
    customerId: customer2.id,
    name: "Law Firm Website",
    description: "Professional website with case inquiry forms",
    status: "active",
  }).returning();

  const [project3] = await db.insert(projects).values({
    customerId: customer3.id,
    name: "Fitness Studio Landing Page",
    description: "Single page site with class schedule and booking",
    status: "completed",
  }).returning();

  const rateValues = [
    { code: "page_design", name: "Page Design", description: "Full page design and layout", unitLabel: "page", rateCents: 20000 },
    { code: "image_asset", name: "Image / Asset Creation", description: "Custom graphics, icons, or image editing", unitLabel: "asset", rateCents: 2500 },
    { code: "revision_round", name: "Revision Round", description: "Round of client-requested revisions", unitLabel: "round", rateCents: 7500 },
    { code: "consultation", name: "Consultation / Meeting", description: "Client consultation or strategy meeting", unitLabel: "session", rateCents: 10000 },
    { code: "feature_build", name: "Custom Feature Build", description: "Interactive feature or integration", unitLabel: "feature", rateCents: 35000 },
    { code: "content_writing", name: "Content Writing", description: "Copywriting for pages or sections", unitLabel: "page", rateCents: 5000 },
    { code: "bug_fix", name: "Bug Fix / Maintenance", description: "Bug fixes and minor maintenance", unitLabel: "fix", rateCents: 5000 },
    { code: "hosting_month", name: "Monthly Hosting", description: "Website hosting per month", unitLabel: "month", rateCents: 2500 },
  ];

  const rates = await db.insert(billingRates).values(rateValues).returning();
  const rateMap: Record<string, string> = {};
  rates.forEach((r) => { rateMap[r.code] = r.id; });

  const now = new Date();
  const daysAgo = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt; };

  const [inv1] = await db.insert(invoices).values({
    customerId: customer3.id,
    projectId: project3.id,
    invoiceNumber: "INV-2026-0001",
    status: "paid",
    issuedAt: daysAgo(45),
    dueDate: daysAgo(15),
    subtotalCents: 72500,
    taxRate: "10",
    taxAmountCents: 7250,
    totalAmountCents: 79750,
    currency: "USD",
  }).returning();

  await db.insert(invoiceLineItems).values([
    { invoiceId: inv1.id, description: "Page Design — Landing page layout", quantity: "1", unitPrice: 20000, totalCents: 20000 },
    { invoiceId: inv1.id, description: "Image / Asset Creation — Hero banner and icons", quantity: "5", unitPrice: 2500, totalCents: 12500 },
    { invoiceId: inv1.id, description: "Custom Feature Build — Class booking widget", quantity: "1", unitPrice: 35000, totalCents: 35000 },
    { invoiceId: inv1.id, description: "Content Writing — Landing page copy", quantity: "1", unitPrice: 5000, totalCents: 5000 },
  ]);

  const [inv2] = await db.insert(invoices).values({
    customerId: customer2.id,
    projectId: project2.id,
    invoiceNumber: "INV-2026-0002",
    status: "pending",
    issuedAt: daysAgo(40),
    dueDate: daysAgo(10),
    subtotalCents: 85000,
    taxRate: "10",
    taxAmountCents: 8500,
    totalAmountCents: 93500,
    currency: "USD",
  }).returning();

  await db.insert(invoiceLineItems).values([
    { invoiceId: inv2.id, description: "Page Design — Home, About, Practice Areas", quantity: "3", unitPrice: 20000, totalCents: 60000 },
    { invoiceId: inv2.id, description: "Consultation / Meeting — Kickoff and review", quantity: "2", unitPrice: 10000, totalCents: 20000 },
    { invoiceId: inv2.id, description: "Content Writing — Practice area descriptions", quantity: "1", unitPrice: 5000, totalCents: 5000 },
  ]);

  await db.insert(workEntries).values([
    { projectId: project1.id, customerId: customer1.id, rateId: rateMap["page_design"], quantity: "2", description: "Homepage and menu page", recordedAt: daysAgo(5), invoiceId: null },
    { projectId: project1.id, customerId: customer1.id, rateId: rateMap["image_asset"], quantity: "8", description: "Food photography editing", recordedAt: daysAgo(4), invoiceId: null },
    { projectId: project1.id, customerId: customer1.id, rateId: rateMap["consultation"], quantity: "1", description: "Initial design review meeting", recordedAt: daysAgo(7), invoiceId: null },
    { projectId: project1.id, customerId: customer1.id, rateId: rateMap["feature_build"], quantity: "1", description: "Online ordering integration", recordedAt: daysAgo(2), invoiceId: null },
    { projectId: project1.id, customerId: customer1.id, rateId: rateMap["content_writing"], quantity: "2", description: "Menu descriptions and about page", recordedAt: daysAgo(3), invoiceId: null },
    { projectId: project2.id, customerId: customer2.id, rateId: rateMap["page_design"], quantity: "1", description: "Contact page with case inquiry form", recordedAt: daysAgo(1), invoiceId: null },
    { projectId: project2.id, customerId: customer2.id, rateId: rateMap["revision_round"], quantity: "1", description: "Color scheme adjustments", recordedAt: daysAgo(1), invoiceId: null },
  ]);

  await db.insert(workEntries).values([
    { projectId: project3.id, customerId: customer3.id, rateId: rateMap["page_design"], quantity: "1", description: "Landing page layout", recordedAt: daysAgo(50), invoiceId: inv1.id },
    { projectId: project3.id, customerId: customer3.id, rateId: rateMap["image_asset"], quantity: "5", description: "Hero banner and icons", recordedAt: daysAgo(48), invoiceId: inv1.id },
    { projectId: project3.id, customerId: customer3.id, rateId: rateMap["feature_build"], quantity: "1", description: "Class booking widget", recordedAt: daysAgo(46), invoiceId: inv1.id },
    { projectId: project3.id, customerId: customer3.id, rateId: rateMap["content_writing"], quantity: "1", description: "Landing page copy", recordedAt: daysAgo(47), invoiceId: inv1.id },
  ]);

  await db.insert(paymentMethods).values([
    { customerId: customer1.id, type: "card", brand: "visa", last4: "4242", expiryMonth: 12, expiryYear: 2027, isDefault: true },
    { customerId: customer2.id, type: "card", brand: "mastercard", last4: "8888", expiryMonth: 6, expiryYear: 2028, isDefault: true },
    { customerId: customer3.id, type: "card", brand: "amex", last4: "1234", expiryMonth: 3, expiryYear: 2027, isDefault: true },
  ]);

  console.log("Database seeded successfully!");
}
