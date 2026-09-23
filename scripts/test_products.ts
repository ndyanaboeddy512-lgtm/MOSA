import { PrismaClient } from "@prisma/client";
import { formatBusinessRecord } from "../src/lib/format-business";
import { serializePublicBusiness } from "../src/lib/public-serializer";

const prisma = new PrismaClient();

async function runTests() {
  console.log("================================================================================");
  console.log("MOSA PRODUCT & SERVICE MECHANISM VERIFICATION SUITE");
  console.log("================================================================================");

  const testId = `test_${Date.now()}`;
  const testPhone = `+25078${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testBusinessName = `Test Enterprise ${testId}`;

  console.log("\n1. Creating test business in Neon PostgreSQL...");
  const business = await prisma.business.create({
    data: {
      name: testBusinessName,
      nameRw: `${testBusinessName} Kinyarwanda`,
      description: "A test business for verifying products, services, media, and captions.",
      category: "SERVICES",
      categoryDisplay: "Services & Consulting",
      district: "Nyarugenge",
      sector: "Nyarugenge",
      cell: "Biryogo",
      phone: testPhone,
      latitude: -1.9441,
      longitude: 30.0619,
      verificationStatus: "BUSINESS_VERIFIED",
      status: "ACTIVE",
    },
  });
  console.log(`✓ Business created with ID: ${business.id}`);

  console.log("\n2. Creating PRODUCT with Image + Required Caption...");
  const productWithImage = await prisma.product.create({
    data: {
      businessId: business.id,
      name: "Handcrafted Coffee Beans 500g",
      nameRw: "Ikawa Yisukuye 500g",
      description: "Locally roasted bourbon arabica coffee beans from Huye mountain.",
      price: 6500,
      priceType: "FIXED",
      unit: "pack",
      isService: false,
      isEstimated: false,
      isAvailable: true,
      mediaUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...",
      mediaType: "IMAGE",
      mediaCaption: "Freshly roasted Rwanda Bourbon Arabica beans ready for packaging",
    },
  });
  console.log(`✓ Product created with ID: ${productWithImage.id}`);
  console.log(`  - Name: ${productWithImage.name}`);
  console.log(`  - Media: ${productWithImage.mediaType} (${productWithImage.mediaUrl?.substring(0, 30)}...)`);
  console.log(`  - Caption: "${productWithImage.mediaCaption}"`);

  if (!productWithImage.mediaCaption) {
    throw new Error("FAIL: Product mediaCaption was not stored!");
  }

  console.log("\n3. Creating SERVICE with Video + Required Caption + Contact for price...");
  const serviceWithVideo = await prisma.product.create({
    data: {
      businessId: business.id,
      name: "Architectural Interior Design & Renovation",
      nameRw: "Ubwubatsi n'imitako y'inzu",
      description: "Full service residential and commercial space planning and renovation.",
      price: 0,
      priceType: "ESTIMATED",
      unit: "project",
      isService: true,
      isEstimated: true,
      isAvailable: true,
      mediaUrl: "https://assets.mosa.rw/videos/interior-demo.mp4",
      mediaType: "VIDEO",
      mediaCaption: "Walkthrough of completed commercial renovation in Kigali Heights",
    },
  });
  console.log(`✓ Service created with ID: ${serviceWithVideo.id}`);
  console.log(`  - Name: ${serviceWithVideo.name}`);
  console.log(`  - isService: ${serviceWithVideo.isService}`);
  console.log(`  - Price: ${serviceWithVideo.price} (${serviceWithVideo.priceType})`);
  console.log(`  - Caption: "${serviceWithVideo.mediaCaption}"`);

  if (!serviceWithVideo.mediaCaption) {
    throw new Error("FAIL: Service mediaCaption was not stored!");
  }

  console.log("\n4. Creating Product without media (text only)...");
  const textOnlyProduct = await prisma.product.create({
    data: {
      businessId: business.id,
      name: "Simple Notebook A5",
      price: 1500,
      priceType: "FIXED",
      unit: "pcs",
      isService: false,
    },
  });
  console.log(`✓ Text-only product created: ${textOnlyProduct.id} (mediaUrl: ${textOnlyProduct.mediaUrl || "none"})`);

  console.log("\n5. Verifying direct Neon PostgreSQL query for business products...");
  const dbProducts = await prisma.product.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  });
  console.log(`✓ Retrieved ${dbProducts.length} items from Neon PostgreSQL:`);
  for (const item of dbProducts) {
    console.log(`  - [${item.isService ? "SERVICE" : "PRODUCT"}] "${item.name}" | Price: ${item.price} Frw | Media: ${item.mediaType || "none"} | Caption: ${item.mediaCaption ? `"${item.mediaCaption}"` : "none"}`);
  }
  if (dbProducts.length !== 3) {
    throw new Error(`FAIL: Expected 3 products, found ${dbProducts.length}`);
  }

  console.log("\n6. Verifying Owner updates product media and caption...");
  const updatedProduct = await prisma.product.update({
    where: { id: productWithImage.id },
    data: {
      mediaCaption: "Updated Caption: Premium Bourbon Arabica single-origin beans",
      price: 7000,
    },
  });
  console.log(`✓ Product updated successfully! New Caption: "${updatedProduct.mediaCaption}"`);
  if (updatedProduct.mediaCaption !== "Updated Caption: Premium Bourbon Arabica single-origin beans") {
    throw new Error("FAIL: Product mediaCaption was not updated correctly!");
  }

  console.log("\n7. Verifying Public Business Serializer (formatBusinessRecord & serializePublicBusiness)...");
  const fullBusiness = await prisma.business.findUnique({
    where: { id: business.id },
    include: {
      products: true,
      businessHours: true,
      media: true,
    },
  });

  const formatted = formatBusinessRecord(fullBusiness);
  console.log(`✓ Formatted business: ${formatted.name}`);
  console.log(`✓ Formatted products count: ${formatted.products.length}`);

  const formattedCoffee = formatted.products.find((p) => p.id === productWithImage.id);
  const formattedRenovation = formatted.products.find((p) => p.id === serviceWithVideo.id);

  if (!formattedCoffee || !formattedCoffee.mediaUrl || formattedCoffee.mediaCaption !== "Updated Caption: Premium Bourbon Arabica single-origin beans") {
    throw new Error("FAIL: formatBusinessRecord did not preserve coffee media or caption!");
  }
  console.log("✓ formatBusinessRecord Coffee Product verified with media & caption");

  if (!formattedRenovation || !formattedRenovation.mediaUrl || !formattedRenovation.mediaCaption || formattedRenovation.mediaType !== "VIDEO") {
    throw new Error("FAIL: formatBusinessRecord did not preserve renovation service video or caption!");
  }
  console.log("✓ formatBusinessRecord Renovation Service verified with video & caption & service status");

  // Verify serializePublicBusiness
  const serialized = serializePublicBusiness(fullBusiness);
  console.log(`✓ Serialized public business: ${serialized.name}`);
  console.log(`✓ Serialized products count: ${serialized.products.length}`);

  const pubCoffee = serialized.products.find((p) => p.id === productWithImage.id);
  const pubRenovation = serialized.products.find((p) => p.id === serviceWithVideo.id);

  if (!pubCoffee || !pubCoffee.mediaUrl || pubCoffee.mediaCaption !== "Updated Caption: Premium Bourbon Arabica single-origin beans") {
    throw new Error("FAIL: serializePublicBusiness did not preserve coffee media or caption!");
  }
  console.log("✓ serializePublicBusiness Coffee Product verified with media & caption");

  if (!pubRenovation || !pubRenovation.mediaUrl || !pubRenovation.mediaCaption || pubRenovation.mediaType !== "VIDEO") {
    throw new Error("FAIL: serializePublicBusiness did not preserve renovation service video or caption!");
  }
  console.log("✓ serializePublicBusiness Renovation Service verified with video & caption & service status");

  console.log("\n8. Cleaning up test records from Neon PostgreSQL...");
  await prisma.product.deleteMany({ where: { businessId: business.id } });
  await prisma.business.delete({ where: { id: business.id } });
  console.log("✓ Test business and products deleted cleanly.");

  await prisma.$disconnect();
  console.log("\n================================================================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY! Product & Service mechanism verified with Neon DB.");
  console.log("================================================================================");
}

runTests().catch(async (e) => {
  console.error("Test execution failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
