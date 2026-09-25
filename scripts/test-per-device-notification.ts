import { PrismaClient } from '@prisma/client';
import * as admin from 'firebase-admin';
import { NotificationService } from '../src/notification/notification.service';
import { UserService } from '../src/user/user.service';
import { PrismaService } from '../src/prisma/prisma.service';

interface SentPush {
  token: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 Starting Per-Device Multi-Language Notification Test');
  console.log('===============================================================');

  const prisma = new PrismaClient();
  const prismaService = prisma as unknown as PrismaService;

  // Mock I18nService
  const mockI18n: any = {
    t: (key: string, options?: any) => key,
  };

  const notificationService = new NotificationService(prismaService, mockI18n);

  // Partial mock for UserService dependencies
  const mockJwt: any = {};
  const mockKyc: any = {};
  const mockMail: any = {};
  const userService = new UserService(
    prismaService,
    mockJwt,
    mockKyc,
    notificationService,
    mockMail,
  );

  // Intercept firebase-admin messaging().send and sendEachForMulticast
  const sentPushes: SentPush[] = [];
  try {
    const messaging = admin.messaging();
    (messaging as any).send = async (msg: any) => {
      sentPushes.push({
        token: msg.token,
        title: msg.data?.title || msg.notification?.title,
        body: msg.data?.body || msg.notification?.body,
        data: msg.data,
      });
      return `mock-message-id-${Date.now()}`;
    };
    (messaging as any).sendEachForMulticast = async (msg: any) => {
      for (const token of msg.tokens || []) {
        sentPushes.push({
          token,
          title: msg.data?.title || msg.notification?.title,
          body: msg.data?.body || msg.notification?.body,
          data: msg.data,
        });
      }
      return { responses: (msg.tokens || []).map(() => ({ success: true })) };
    };
  } catch (err) {
    // If admin app isn't initialized yet, initialize mock
    try {
      admin.initializeApp({
        projectId: 'test-project',
      });
      const messaging = admin.messaging();
      (messaging as any).send = async (msg: any) => {
        sentPushes.push({
          token: msg.token,
          title: msg.data?.title || msg.notification?.title,
          body: msg.data?.body || msg.notification?.body,
          data: msg.data,
        });
        return `mock-message-id-${Date.now()}`;
      };
      (messaging as any).sendEachForMulticast = async (msg: any) => {
        for (const token of msg.tokens || []) {
          sentPushes.push({
            token,
            title: msg.data?.title || msg.notification?.title,
            body: msg.data?.body || msg.notification?.body,
            data: msg.data,
          });
        }
        return { responses: (msg.tokens || []).map(() => ({ success: true })) };
      };
    } catch {
      // ignore
    }
  }

  try {
    // 1. Find or create test user "Viren"
    console.log('\n[1] Finding or creating test user "Viren"...');
    let viren = await prisma.user.findFirst({
      where: { email: 'viren.device.test@valens.app' },
    });

    if (!viren) {
      viren = await prisma.user.create({
        data: {
          email: 'viren.device.test@valens.app',
          displayName: 'Viren_Device_Test',
          userName: 'viren_device_test',
          registrationType: 'NORMAL' as any,
          language: 'en',
        },
      });
      console.log(`Created test user Viren with ID: ${viren.id}`);
    } else {
      console.log(`Found existing test user Viren with ID: ${viren.id}`);
    }

    // Clean existing devices and notifications for test user
    await prisma.deviceAccount.deleteMany({ where: { userId: viren.id } });
    await prisma.notification.deleteMany({ where: { userId: viren.id } });

    // 2. Register 4 Devices for Viren
    console.log('\n[2] Registering 4 devices for Viren with different languages...');
    // Device 1 -> Portuguese (pt)
    await userService.updateFcmToken(viren.id, 'fcm_viren_device_001', {
      deviceId: 'device_001',
      platform: 'android',
      language: 'pt',
    });
    console.log('   ✔ Device 1 registered: device_001 -> Language: pt (Portuguese), Token: fcm_viren_device_001');

    // Device 2 -> English (en)
    await userService.updateFcmToken(viren.id, 'fcm_viren_device_002', {
      deviceId: 'device_002',
      platform: 'ios',
      language: 'en',
    });
    console.log('   ✔ Device 2 registered: device_002 -> Language: en (English), Token: fcm_viren_device_002');

    // Device 3 -> Hindi (hi)
    await userService.updateFcmToken(viren.id, 'fcm_viren_device_003', {
      deviceId: 'device_003',
      platform: 'android',
      language: 'hi',
    });
    console.log('   ✔ Device 3 registered: device_003 -> Language: hi (Hindi), Token: fcm_viren_device_003');

    // Device 4 -> French (fr)
    await userService.updateFcmToken(viren.id, 'fcm_viren_device_004', {
      deviceId: 'device_004',
      platform: 'web',
      language: 'fr',
    });
    console.log('   ✔ Device 4 registered: device_004 -> Language: fr (French), Token: fcm_viren_device_004');

    // Verify devices in database
    const initialDevices = await prisma.deviceAccount.findMany({
      where: { userId: viren.id },
      orderBy: { deviceId: 'asc' },
    });
    console.log('\n   Database Device State:');
    initialDevices.forEach((d) => {
      console.log(`     - Device: ${d.deviceId}, Lang: ${d.language}, Token: ${d.fcmToken}, Active: ${d.isActive}`);
    });

    // 3. Send ONE notification to Viren
    console.log('\n[3] Sending ONE notification to Viren: "Welcome to Valens!"...');
    sentPushes.length = 0; // clear log
    await notificationService.sendNotificationToUser(
      viren.id,
      'Welcome to Valens!',
      'Welcome to the Valens community. Explore now.',
    );

    console.log(`\n   Notifications sent to FCM: Total = ${sentPushes.length}`);
    for (const push of sentPushes) {
      console.log(`     → Target Token: ${push.token} | Title: "${push.title}"`);
    }

    // Assertions for Round 1
    const pushDev1 = sentPushes.find((p) => p.token === 'fcm_viren_device_001');
    const pushDev2 = sentPushes.find((p) => p.token === 'fcm_viren_device_002');
    const pushDev3 = sentPushes.find((p) => p.token === 'fcm_viren_device_003');
    const pushDev4 = sentPushes.find((p) => p.token === 'fcm_viren_device_004');

    if (!pushDev1 || !pushDev2 || !pushDev3 || !pushDev4) {
      throw new Error('FAILED: Not all 4 devices received the push notification!');
    }

    console.log('\n   Verifying expected translations per device:');
    console.log(`   Device 1 (PT) received: "${pushDev1.title}" (Expected: "Bem-vindo ao Valens!")`);
    console.log(`   Device 2 (EN) received: "${pushDev2.title}" (Expected: "Welcome to Valens!")`);
    console.log(`   Device 3 (HI) received: "${pushDev3.title}" (Expected: "वैलेन्स में आपका स्वागत है!")`);
    console.log(`   Device 4 (FR) received: "${pushDev4.title}" (Expected: "Bienvenue sur Valens !")`);

    if (pushDev1.title !== 'Bem-vindo ao Valens!') throw new Error(`Device 1 expected PT but got "${pushDev1.title}"`);
    if (pushDev2.title !== 'Welcome to Valens!') throw new Error(`Device 2 expected EN but got "${pushDev2.title}"`);
    if (pushDev3.title !== 'वैलेन्स में आपका स्वागत है!') throw new Error(`Device 3 expected HI but got "${pushDev3.title}"`);
    if (pushDev4.title !== 'Bienvenue sur Valens !') throw new Error(`Device 4 expected FR but got "${pushDev4.title}"`);
    console.log('   ✅ ROUND 1 SUCCESS: Each device received notification in its specific language!');

    // 4. Update Device 1 language from pt -> en
    console.log('\n[4] Updating Device 1 language from "pt" to "en"...');
    await userService.updateLanguage(viren.id, 'en', 'device_001');
    console.log('   ✔ Device 1 language updated to "en"');

    // Verify that ONLY Device 1 changed to English and other devices remain intact
    const updatedDevices = await prisma.deviceAccount.findMany({
      where: { userId: viren.id },
      orderBy: { deviceId: 'asc' },
    });
    console.log('\n   Database Device State After Device 1 Update:');
    updatedDevices.forEach((d) => {
      console.log(`     - Device: ${d.deviceId}, Lang: ${d.language}, Token: ${d.fcmToken}`);
    });

    const dev1 = updatedDevices.find((d) => d.deviceId === 'device_001');
    const dev2 = updatedDevices.find((d) => d.deviceId === 'device_002');
    const dev3 = updatedDevices.find((d) => d.deviceId === 'device_003');
    const dev4 = updatedDevices.find((d) => d.deviceId === 'device_004');

    if (dev1?.language !== 'en') throw new Error(`Device 1 language expected to be "en", but is "${dev1?.language}"`);
    if (dev2?.language !== 'en') throw new Error(`Device 2 language expected to be "en", but is "${dev2?.language}"`);
    if (dev3?.language !== 'hi') throw new Error(`Device 3 language expected to be "hi", but is "${dev3?.language}"`);
    if (dev4?.language !== 'fr') throw new Error(`Device 4 language expected to be "fr", but is "${dev4?.language}"`);
    console.log('   ✅ Device language isolation verified: Only Device 1 changed to EN; Device 2 (EN), Device 3 (HI), Device 4 (FR) preserved!');

    // 5. Send ONE notification to Viren again
    console.log('\n[5] Sending ONE notification to Viren again after language change...');
    sentPushes.length = 0;
    await notificationService.sendNotificationToUser(
      viren.id,
      'Welcome to Valens!',
      'Welcome to the Valens community. Explore now.',
    );

    console.log(`\n   Notifications sent to FCM: Total = ${sentPushes.length}`);
    for (const push of sentPushes) {
      console.log(`     → Target Token: ${push.token} | Title: "${push.title}"`);
    }

    const push2Dev1 = sentPushes.find((p) => p.token === 'fcm_viren_device_001');
    const push2Dev2 = sentPushes.find((p) => p.token === 'fcm_viren_device_002');
    const push2Dev3 = sentPushes.find((p) => p.token === 'fcm_viren_device_003');
    const push2Dev4 = sentPushes.find((p) => p.token === 'fcm_viren_device_004');

    console.log('\n   Verifying expected translations per device after update:');
    console.log(`   Device 1 (NOW EN) received: "${push2Dev1?.title}" (Expected: "Welcome to Valens!")`);
    console.log(`   Device 2 (EN) received: "${push2Dev2?.title}" (Expected: "Welcome to Valens!")`);
    console.log(`   Device 3 (HI) received: "${push2Dev3?.title}" (Expected: "वैलेन्स में आपका स्वागत है!")`);
    console.log(`   Device 4 (FR) received: "${push2Dev4?.title}" (Expected: "Bienvenue sur Valens !")`);

    if (push2Dev1?.title !== 'Welcome to Valens!') throw new Error(`Device 1 expected EN but got "${push2Dev1?.title}"`);
    if (push2Dev2?.title !== 'Welcome to Valens!') throw new Error(`Device 2 expected EN but got "${push2Dev2?.title}"`);
    if (push2Dev3?.title !== 'वैलेन्स में आपका स्वागत है!') throw new Error(`Device 3 expected HI but got "${push2Dev3?.title}"`);
    if (push2Dev4?.title !== 'Bienvenue sur Valens !') throw new Error(`Device 4 expected FR but got "${push2Dev4?.title}"`);
    console.log('   ✅ ROUND 2 SUCCESS: Device 1 now receives English, while Devices 2, 3, 4 receive their respective languages!');

    // 6. Test In-App Notification Localization per Device
    console.log('\n[6] Testing in-app notification listing per deviceId...');
    const notifsForDev3 = await notificationService.getNotifications(viren.id, { deviceId: 'device_003' });
    const notifsForDev4 = await notificationService.getNotifications(viren.id, { deviceId: 'device_004' });
    const notifsForDev1 = await notificationService.getNotifications(viren.id, { deviceId: 'device_001' });

    console.log(`   Device 3 in-app first notification title: "${notifsForDev3[0]?.title}" (Expected HI)`);
    console.log(`   Device 4 in-app first notification title: "${notifsForDev4[0]?.title}" (Expected FR)`);
    console.log(`   Device 1 in-app first notification title: "${notifsForDev1[0]?.title}" (Expected EN)`);

    console.log('\n===============================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    try {
      await prisma.deviceAccount.deleteMany({ where: { user: { email: 'viren.device.test@valens.app' } } });
      await prisma.notification.deleteMany({ where: { user: { email: 'viren.device.test@valens.app' } } });
      await prisma.user.deleteMany({ where: { email: 'viren.device.test@valens.app' } });
    } catch {
      // ignore
    }
    await prisma.$disconnect();
  }
}

runTest();
