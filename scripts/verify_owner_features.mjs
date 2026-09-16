import { PrismaClient } from '@prisma/client';
import { evaluateBusinessHealth } from '../src/lib/business-health.ts';
import { checkConfirmationStatus } from '../src/lib/confirmation-engine.ts';
import { syncAndGetBusinessReminders } from '../src/lib/reminders-engine.ts';
import { sendBusinessSMS } from '../src/lib/sms/index.ts';

const prisma = new PrismaClient();

async function runTests() {
  console.log('=== MOSA OWNER DASHBOARD AND OPERATIONAL INTEGRITY TEST ===\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log('PASS: ' + name);
      passed++;
    } catch (err) {
      console.error('FAIL: ' + name + ' -> ' + err.message);
      failed++;
    }
  }

  try {
    await test('Neon DB Connection', async () => {
      const count = await prisma.business.count();
      if (typeof count !== 'number') throw new Error('Count failed');
      console.log('   Total businesses in Neon: ' + count);
    });

    await test('Schema operational fields present', async () => {
      const sample = await prisma.business.findFirst({
        select: { id: true, name: true, healthScore: true, confirmationIntervalDays: true }
      });
      if (!sample) throw new Error('No business');
      if (typeof sample.healthScore !== 'number') throw new Error('healthScore missing');
    });

    await test('Health Score Engine computation', async () => {
      const testBiz = {
        name: 'Test Barber',
        description: 'Quality cuts',
        phone: '+250788111222',
        products: [{ id: 'p1', name: 'Cut', price: 2000, isAvailable: true }],
        openingHours: [{ day: 'Monday', open: '08:00', close: '20:00', isClosed: false }],
        lastConfirmedAt: new Date().toISOString()
      };
      const health = evaluateBusinessHealth(testBiz);
      if (health.score < 50) throw new Error('Health score too low');
      console.log('   Computed score: ' + health.score + '% (' + health.grade + ')');
    });

    await test('Confirmation Freshness Engine', async () => {
      const status = checkConfirmationStatus({
        lastConfirmedAt: new Date().toISOString(),
        confirmationIntervalDays: 30
      });
      if (status.needsConfirmation) throw new Error('Expected fresh business not to need confirmation');
      console.log('   Days remaining until confirmation: ' + status.daysRemaining);
    });

    await test('SMS Engine logs to Neon with CONFIGURATION_REQUIRED', async () => {
      const res = await sendBusinessSMS({
        recipientPhone: '+250788112233',
        templateId: 'UPDATE_SUCCESS',
        variables: { businessName: 'Test Biz', updateType: 'price list' },
        language: 'rw'
      });
      if (!res.loggedId) throw new Error('No SMS logged');
      const msg = await prisma.sMSMessage.findUnique({ where: { id: res.loggedId } });
      if (!msg) throw new Error('SMS record missing in DB');
      if (msg.status !== 'CONFIGURATION_REQUIRED') {
        throw new Error('Expected CONFIGURATION_REQUIRED, got ' + msg.status);
      }
      console.log('   SMS ID: ' + msg.id + ' Status: ' + msg.status);
    });

    await test('Price Update and Change Audit Trail in Neon', async () => {
      const biz = await prisma.business.findFirst({ include: { products: true } });
      if (!biz) throw new Error('No biz');
      const p = biz.products[0];
      if (!p) throw new Error('No product');
      const oldP = p.price;
      const newP = oldP + 200;

      await prisma.product.update({ where: { id: p.id }, data: { price: newP } });

      const hist = await prisma.businessChangeHistory.create({
        data: {
          businessId: biz.id,
          action: 'PRICE_CHANGED',
          fieldChanged: 'price',
          previousValue: oldP + ' RWF',
          newValue: newP + ' RWF',
          source: 'OWNER_DASHBOARD'
        }
      });
      if (!hist.id) throw new Error('Failed history create');

      const check = await prisma.businessChangeHistory.findUnique({ where: { id: hist.id } });
      if (!check) throw new Error('Audit record not found');
      console.log('   Audit record saved: ' + check.id + ' (' + check.previousValue + ' -> ' + check.newValue + ')');

      // Revert product price
      await prisma.product.update({ where: { id: p.id }, data: { price: oldP } });
    });

    await test('1-Click Keep-Alive Confirmation Update', async () => {
      const biz = await prisma.business.findFirst();
      const now = new Date();
      await prisma.business.update({
        where: { id: biz.id },
        data: { lastConfirmedAt: now }
      });
      console.log('   Confirmed biz alive: ' + biz.name + ' at ' + now.toISOString());
    });

    await test('Business Claim Submission and Admin Review', async () => {
      const biz = await prisma.business.findFirst();
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('No user in database');

      const claim = await prisma.businessClaim.create({
        data: {
          businessId: biz.id,
          userId: user.id,
          ownerName: 'Test Owner',
          claimPhone: '+250788000111',
          nationalIdOrDoc: '1199000000000000',
          status: 'PENDING'
        }
      });
      const reviewed = await prisma.businessClaim.update({
        where: { id: claim.id },
        data: { status: 'APPROVED', reviewedBy: 'admin@mosa.rw', reviewedAt: new Date() }
      });
      if (reviewed.status !== 'APPROVED') throw new Error('Approval failed');
      console.log('   Claim reviewed and approved: ' + reviewed.id);
      await prisma.businessClaim.delete({ where: { id: claim.id } });
    });

  } finally {
    await prisma.$disconnect();
  }

  console.log('\nResults: ' + passed + ' Passed | ' + failed + ' Failed');
  if (failed > 0) process.exit(1);
}

runTests();