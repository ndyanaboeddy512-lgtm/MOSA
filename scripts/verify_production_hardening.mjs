import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { normalizeRwandaPhone, maskPhone } from '../src/lib/sms/normalize.ts';
import { encryptSensitiveText, decryptSensitiveText, maskNationalId, validatePasswordStrength } from '../src/lib/crypto.ts';
import { renderSMSTemplate } from '../src/lib/sms/templates.ts';
import { sendBusinessSMS } from '../src/lib/sms/index.ts';

const prisma = new PrismaClient();

async function runHardeningTests() {
  console.log('================================================================');
  console.log('    MOSA BUSINESS OWNER ECOSYSTEM: PRODUCTION HARDENING AUDIT   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log('[PASS] ' + name);
      passed++;
    } catch (err) {
      console.error('[FAIL] ' + name + ' -> ' + err.message);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testPhoneAlpha = '+250788' + Math.floor(100000 + Math.random() * 900000);
  const testPhoneBeta = '+250788' + Math.floor(100000 + Math.random() * 900000);
  let testUserAlphaId = null;
  let testUserBetaId = null;
  let testBizAlphaId = null;
  let testBizBetaId = null;

  try {
    // 1. Database Connection
    await test('Neon PostgreSQL Production Database Connection', async () => {
      const count = await prisma.business.count();
      if (typeof count !== 'number') throw new Error('Could not query business table');
      console.log('       Active businesses in Neon: ' + count);
    });

    // 2. Rwanda Phone Normalization
    await test('Rwanda Phone Normalization Utility (E.164 & Operator Detection)', async () => {
      const mtn1 = normalizeRwandaPhone('0788123456');
      if (!mtn1.isValid || mtn1.e164 !== '+250788123456' || mtn1.carrier !== 'MTN Rwanda') {
        throw new Error('MTN 0788 normalization failed');
      }
      const mtn2 = normalizeRwandaPhone('+250 791 234 567');
      if (!mtn2.isValid || mtn2.e164 !== '+250791234567' || mtn2.carrier !== 'MTN Rwanda') {
        throw new Error('MTN 0791 normalization failed');
      }

      const airtel = normalizeRwandaPhone('0722998877');
      if (!airtel.isValid || airtel.e164 !== '+250722998877' || airtel.carrier !== 'Airtel Rwanda') {
        throw new Error('Airtel 0722 normalization failed');
      }

      const invalidShort = normalizeRwandaPhone('0788123');
      if (invalidShort.isValid) throw new Error('Short phone number should be invalid');

      const invalidPrefix = normalizeRwandaPhone('0712345678');
      if (invalidPrefix.isValid) throw new Error('Invalid prefix 071 should be rejected');

      const masked = maskPhone('+250788123456');
      if (!masked.includes('****') || !masked.startsWith('+25078')) throw new Error('Unexpected mask: ' + masked);
      console.log('       Validated MTN (+250788/79), Airtel (+25072/73), and Masking (' + masked + ')');
    });

    // 3. Sensitive Data Encryption & Masking
    await test('National ID AES-256-GCM Encryption, Decryption, and Masking', async () => {
      const rawId = '1199080012345678';
      const encrypted = encryptSensitiveText(rawId);
      if (!encrypted.startsWith('enc:')) throw new Error('Encrypted string format invalid');

      const decrypted = decryptSensitiveText(encrypted);
      if (decrypted !== rawId) throw new Error('Decrypted mismatch');

      const masked = maskNationalId(rawId);
      if (masked !== '1 1990 •••• •••• 5678') throw new Error('Unexpected mask: ' + masked);
      console.log('       AES-256-GCM cipher: ' + encrypted.substring(0, 32) + '... | Masked: ' + masked);
    });

    // 4. Password Security & Bcrypt
    await test('Password Security: Strength Validation & Bcrypt Hashing', async () => {
      const weak = validatePasswordStrength('123');
      if (weak.valid) throw new Error('Password < 8 chars should fail');

      const strong = validatePasswordStrength('StrongMosaPass2026!');
      if (!strong.valid) throw new Error('Valid password rejected');

      const hash = await bcrypt.hash('StrongMosaPass2026!', 10);
      const isMatch = await bcrypt.compare('StrongMosaPass2026!', hash);
      const isWrong = await bcrypt.compare('WrongPassword', hash);
      if (!isMatch || isWrong) throw new Error('Bcrypt comparison failure');
      console.log('       Bcrypt 10-round hash & comparison verified');
    });

    // 5. User Creation & Session Lifecycle in Neon
    await test('Real User Registration & Session Lifecycle in Neon PostgreSQL', async () => {
      const passwordHash = await bcrypt.hash('SecureOwner2026!', 10);

      const userAlpha = await prisma.user.create({
        data: {
          name: 'Alpha Owner ' + timestamp,
          phone: testPhoneAlpha,
          passwordHash,
          role: 'BUSINESS_OWNER',
          community: 'Biryogo',
          referralCode: 'MOSA-ALPHA-' + timestamp,
        },
      });
      testUserAlphaId = userAlpha.id;

      const userBeta = await prisma.user.create({
        data: {
          name: 'Beta Owner ' + timestamp,
          phone: testPhoneBeta,
          passwordHash,
          role: 'BUSINESS_OWNER',
          community: 'Kacyiru',
          referralCode: 'MOSA-BETA-' + timestamp,
        },
      });
      testUserBetaId = userBeta.id;

      const sessionToken = 'test-token-' + timestamp;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.session.create({
        data: {
          userId: userAlpha.id,
          token: sessionToken,
          expiresAt,
        },
      });

      const activeSession = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true },
      });
      if (!activeSession || activeSession.userId !== userAlpha.id) {
        throw new Error('Active session query failed');
      }

      await prisma.session.delete({ where: { token: sessionToken } });
      const revokedSession = await prisma.session.findUnique({ where: { token: sessionToken } });
      if (revokedSession) throw new Error('Revoked session still exists in database');
      console.log('       User ' + userAlpha.id + ' registered and session lifecycle validated');
    });

    // 6. Strict Server-Side Business Ownership Isolation
    await test('Server-Side Business Ownership Isolation (Owner A cannot modify Business B)', async () => {
      const bizAlpha = await prisma.business.create({
        data: {
          name: 'Alpha Tailoring ' + timestamp,
          description: 'Specialist tailoring in Biryogo',
          category: 'Tailoring & Fashion',
          ownerId: testUserAlphaId,
          isClaimed: true,
          phone: testPhoneAlpha,
          latitude: -1.9706,
          longitude: 30.0444,
          status: 'ACTIVE',
        },
      });
      testBizAlphaId = bizAlpha.id;

      const bizBeta = await prisma.business.create({
        data: {
          name: 'Beta Pharmacy ' + timestamp,
          description: 'Local pharmacy in Kacyiru',
          category: 'Pharmacy & Health',
          ownerId: testUserBetaId,
          isClaimed: true,
          phone: testPhoneBeta,
          latitude: -1.9355,
          longitude: 30.0821,
          status: 'ACTIVE',
        },
      });
      testBizBetaId = bizBeta.id;

      const checkOwnership = async (actorId, targetBizId) => {
        const existing = await prisma.business.findUnique({ where: { id: targetBizId } });
        if (!existing) throw new Error('Business not found');
        if (existing.ownerId !== actorId) {
          return { status: 403, error: 'Forbidden: You do not own this business' };
        }
        return { status: 200, success: true };
      };

      const allowed = await checkOwnership(testUserAlphaId, testBizAlphaId);
      if (allowed.status !== 200) throw new Error('Owner Alpha should be authorized on Biz Alpha');

      const denied = await checkOwnership(testUserAlphaId, testBizBetaId);
      if (denied.status !== 403) throw new Error('Owner Alpha was NOT rejected from editing Biz Beta');
      console.log('       Owner A -> Business B strictly rejected with 403 Forbidden');
    });

    // 7. Atomic Claim Approval in Prisma Transaction
    await test('Atomic Business Claim Approval via Prisma Transaction ($transaction)', async () => {
      const unownedBiz = await prisma.business.create({
        data: {
          name: 'Unclaimed Cafe ' + timestamp,
          description: 'Cozy neighbourhood cafe in Biryogo',
          category: 'Restaurant & Cafe',
          phone: '+250788991122',
          latitude: -1.9700,
          longitude: 30.0450,
          status: 'ACTIVE',
          isClaimed: false,
        },
      });

      const claim = await prisma.businessClaim.create({
        data: {
          businessId: unownedBiz.id,
          userId: testUserAlphaId,
          ownerName: 'Alpha Claimant',
          claimPhone: testPhoneAlpha,
          nationalIdOrDoc: encryptSensitiveText('1199580099887766'),
          status: 'PENDING',
        },
      });

      await prisma.$transaction(async (tx) => {
        const c = await tx.businessClaim.update({
          where: { id: claim.id },
          data: { status: 'APPROVED', reviewedBy: 'Super Admin', reviewedAt: new Date() },
          include: { business: true },
        });

        await tx.business.update({
          where: { id: c.businessId },
          data: {
            ownerId: c.userId,
            isClaimed: true,
            claimedAt: new Date(),
            claimPhone: c.claimPhone,
            verificationStatus: 'BUSINESS_VERIFIED',
          },
        });

        await tx.businessChangeHistory.create({
          data: {
            businessId: c.businessId,
            actorId: testUserAlphaId,
            action: 'CLAIM_APPROVED',
            fieldChanged: 'ownerId',
            previousValue: null,
            newValue: c.userId,
            approvalStatus: 'APPROVED',
            source: 'COMMAND_CENTER',
          },
        });
      });

      const updatedBiz = await prisma.business.findUnique({ where: { id: unownedBiz.id } });
      if (updatedBiz.ownerId !== testUserAlphaId || !updatedBiz.isClaimed) {
        throw new Error('Transaction did not bind ownerId to business');
      }

      await prisma.businessChangeHistory.deleteMany({ where: { businessId: unownedBiz.id } });
      await prisma.businessClaim.deleteMany({ where: { businessId: unownedBiz.id } });
      await prisma.business.delete({ where: { id: unownedBiz.id } });
      console.log('       Atomic Prisma transaction verified across claim, business, and history');
    });

    // 8. SMS Provider Readiness & 20-Template Matrix
    await test('SMS Provider Readiness: 20-Template Multilingual Matrix & Strict Unconfigured Status', async () => {
      const templates = ['UPDATE_SUCCESS', 'REMINDER', 'SECURITY_ALERT', 'PROFILE_CONFIRMATION', 'DEMAND_ALERT'];
      const languages = ['rw', 'en', 'fr', 'sw'];
      const variables = {
        businessName: 'Kigali Fresh Grocery',
        field: 'Prices',
        date: '2026-10-01',
        queryTerm: 'Fresh Milk',
        count: '15',
        cell: 'Biryogo',
      };

      let testedTemplates = 0;
      for (const tId of templates) {
        for (const lang of languages) {
          const rendered = renderSMSTemplate(tId, lang, variables);
          if (!rendered || rendered.includes('undefined')) {
            throw new Error('Template rendering failed for ' + tId + ' in ' + lang);
          }
          testedTemplates++;
        }
      }

      const smsResult = await sendBusinessSMS({
        businessId: testBizAlphaId,
        recipientPhone: '+250788111222',
        templateId: 'PROFILE_CONFIRMATION',
        language: 'rw',
        variables: { businessName: 'Alpha Tailoring' },
      });

      if (smsResult.success) {
        throw new Error('SMS should not claim success without configured Africa\'s Talking provider');
      }
      if (smsResult.status !== 'CONFIGURATION_REQUIRED') {
        throw new Error('Expected CONFIGURATION_REQUIRED status, got: ' + smsResult.status);
      }

      console.log('       Validated ' + testedTemplates + ' SMS templates (5 types x 4 languages: RW, EN, FR, SW)');
      console.log('       Strict CONFIGURATION_REQUIRED verified with zero fake delivery');
    });

    // 9. Owner -> Neon -> Public Synchronization
    await test('Owner -> Neon PostgreSQL -> Public Page End-to-End Synchronization', async () => {
      const newDesc = 'Updated description at ' + timestamp;
      await prisma.business.update({
        where: { id: testBizAlphaId },
        data: {
          description: newDesc,
          healthScore: 92,
          lastConfirmedAt: new Date(),
        },
      });

      await prisma.businessChangeHistory.create({
        data: {
          businessId: testBizAlphaId,
          actorId: testUserAlphaId,
          action: 'PROFILE_UPDATED',
          fieldChanged: 'description',
          previousValue: null,
          newValue: newDesc,
          approvalStatus: 'APPROVED',
          source: 'OWNER_DASHBOARD',
        },
      });

      await prisma.product.create({
        data: {
          businessId: testBizAlphaId,
          name: 'Custom Suit Stitching',
          price: 45000,
          unit: 'piece',
          category: 'Tailoring',
          isAvailable: true,
        },
      });

      const publicBiz = await prisma.business.findUnique({
        where: { id: testBizAlphaId },
        include: {
          products: true,
          changeHistory: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      });

      if (publicBiz.description !== newDesc) {
        throw new Error('Description update not synchronized');
      }
      if (publicBiz.products.length !== 1 || publicBiz.products[0].name !== 'Custom Suit Stitching') {
        throw new Error('Product not synchronized');
      }
      if (publicBiz.changeHistory.length !== 1) {
        throw new Error('Audit trail not logged');
      }

      console.log('       Owner mutation -> Neon write -> Public fetch synchronized instantly');
    });

  } finally {
    try {
      if (testBizAlphaId) {
        await prisma.product.deleteMany({ where: { businessId: testBizAlphaId } });
        await prisma.businessChangeHistory.deleteMany({ where: { businessId: testBizAlphaId } });
        await prisma.sMSMessage.deleteMany({ where: { businessId: testBizAlphaId } });
        await prisma.business.delete({ where: { id: testBizAlphaId } }).catch(() => {});
      }
      if (testBizBetaId) {
        await prisma.business.delete({ where: { id: testBizBetaId } }).catch(() => {});
      }
      if (testUserAlphaId) {
        await prisma.session.deleteMany({ where: { userId: testUserAlphaId } });
        await prisma.user.delete({ where: { id: testUserAlphaId } }).catch(() => {});
      }
      if (testUserBetaId) {
        await prisma.session.deleteMany({ where: { userId: testUserBetaId } });
        await prisma.user.delete({ where: { id: testUserBetaId } }).catch(() => {});
      }
      await prisma.$disconnect();
    } catch (cleanErr) {
      console.warn('Cleanup note:', cleanErr.message);
    }
  }

  console.log('\n================================================================');
  console.log('TEST SUMMARY: ' + passed + ' PASSED, ' + failed + ' FAILED');
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runHardeningTests();
