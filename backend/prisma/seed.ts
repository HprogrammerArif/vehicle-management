import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VMS Database Seeding...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { id: 'org_apex_01' },
    update: {},
    create: {
      id: 'org_apex_01',
      name: 'Apex Global Industries & Logistics',
    },
  });
  console.log('🏢 Organization created:', org.name);

  // 2. Corporate Offices
  const offices = [
    {
      id: 'office_hq',
      name: 'Dhaka Corporate Headquarters',
      type: 'HQ',
      address: 'Plot 15, Road 11, Gulshan-1, Dhaka 1212',
      latitude: 23.7925,
      longitude: 90.4078,
      organizationId: org.id,
    },
    {
      id: 'office_gazipur',
      name: 'Gazipur Heavy Manufacturing Plant',
      type: 'FACTORY',
      address: 'Zone 4, Gazipur Industrial Area, Dhaka',
      latitude: 24.0023,
      longitude: 90.4244,
      organizationId: org.id,
    },
    {
      id: 'office_chittagong',
      name: 'Chittagong Port Logistics Hub',
      type: 'REGIONAL',
      address: 'Agrabad Commercial Area, Chittagong',
      latitude: 22.3384,
      longitude: 91.8317,
      organizationId: org.id,
    },
    {
      id: 'office_sylhet',
      name: 'Sylhet Regional Distribution Office',
      type: 'BRANCH',
      address: 'Zindabazar, Sylhet 3100',
      latitude: 24.8949,
      longitude: 91.8687,
      organizationId: org.id,
    },
  ];

  for (const office of offices) {
    await prisma.office.upsert({
      where: { id: office.id },
      update: {},
      create: office,
    });
  }
  console.log('📍 4 Corporate Offices seeded (HQ, Factory, Logistics, Branch)');

  // 3. Admin & Employees
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);
  const driverPassword = await bcrypt.hash('driver123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vms.com' },
    update: {},
    create: {
      name: 'Tanvir Hossain (Fleet Manager)',
      email: 'admin@vms.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      department: 'Logistics & Fleet Operations',
      employeeId: 'ADM-001',
      phone: '+880 1711 000111',
      organizationId: org.id,
    },
  });

  const emp1 = await prisma.user.upsert({
    where: { email: 'john.doe@vms.com' },
    update: {},
    create: {
      name: 'Johnathan Doe',
      email: 'john.doe@vms.com',
      passwordHash: userPassword,
      role: 'EMPLOYEE',
      department: 'Factory Engineering',
      employeeId: 'EMP-104',
      phone: '+880 1812 222333',
      organizationId: org.id,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: 'sarah.smith@vms.com' },
    update: {},
    create: {
      name: 'Sarah Smith',
      email: 'sarah.smith@vms.com',
      passwordHash: userPassword,
      role: 'EMPLOYEE',
      department: 'Quality Assurance',
      employeeId: 'EMP-109',
      phone: '+880 1913 444555',
      organizationId: org.id,
    },
  });
  console.log('👥 Admin and Employees seeded');

  // 4. Drivers
  const driver1User = await prisma.user.upsert({
    where: { email: 'driver.rahim@vms.com' },
    update: { employeeId: 'DRV-201' },
    create: {
      name: 'Mohammad Rahim',
      email: 'driver.rahim@vms.com',
      employeeId: 'DRV-201',
      passwordHash: driverPassword,
      role: 'DRIVER',
      phone: '+880 1614 777888',
      organizationId: org.id,
    },
  });

  const driver1 = await prisma.driver.upsert({
    where: { userId: driver1User.id },
    update: {},
    create: {
      userId: driver1User.id,
      licenseNumber: 'BRTA-DHK-2021-99881',
      licenseExpiry: new Date('2028-12-31'),
      status: 'AVAILABLE',
      currentLat: 23.7925,
      currentLng: 90.4078,
    },
  });

  const driver2User = await prisma.user.upsert({
    where: { email: 'driver.karim@vms.com' },
    update: { employeeId: 'DRV-202' },
    create: {
      name: 'Abdul Karim',
      email: 'driver.karim@vms.com',
      employeeId: 'DRV-202',
      passwordHash: driverPassword,
      role: 'DRIVER',
      phone: '+880 1715 333444',
      organizationId: org.id,
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { userId: driver2User.id },
    update: {},
    create: {
      userId: driver2User.id,
      licenseNumber: 'BRTA-DHK-2019-44552',
      licenseExpiry: new Date('2027-06-30'),
      status: 'ON_TRIP',
      currentLat: 23.8821,
      currentLng: 90.4132,
    },
  });

  const driver3User = await prisma.user.upsert({
    where: { email: 'driver.alam@vms.com' },
    update: { employeeId: 'DRV-203' },
    create: {
      name: 'Alamgir Hossain',
      email: 'driver.alam@vms.com',
      employeeId: 'DRV-203',
      passwordHash: driverPassword,
      role: 'DRIVER',
      phone: '+880 1516 111222',
      organizationId: org.id,
    },
  });

  const driver3 = await prisma.driver.upsert({
    where: { userId: driver3User.id },
    update: {},
    create: {
      userId: driver3User.id,
      licenseNumber: 'BRTA-CTG-2020-11223',
      licenseExpiry: new Date('2026-11-20'),
      status: 'ON_LEAVE',
    },
  });
  console.log('🚗 Drivers seeded (Available, On Trip, On Leave)');

  // 5. Vehicles
  const v1 = await prisma.vehicle.upsert({
    where: { registrationNo: 'DHK-METRO-GA-1122' },
    update: {},
    create: {
      registrationNo: 'DHK-METRO-GA-1122',
      make: 'Toyota',
      model: 'HiAce Super GL Executive',
      year: 2022,
      type: 'Van',
      capacity: 12,
      fuelType: 'DIESEL',
      fuelEfficiency: 10.5,
      status: 'AVAILABLE',
      odometer: 34200.0,
      organizationId: org.id,
      photo: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800',
    },
  });

  const v2 = await prisma.vehicle.upsert({
    where: { registrationNo: 'DHK-METRO-GHA-3344' },
    update: {},
    create: {
      registrationNo: 'DHK-METRO-GHA-3344',
      make: 'Toyota',
      model: 'Land Cruiser Prado TX-L',
      year: 2023,
      type: 'SUV',
      capacity: 7,
      fuelType: 'OCTANE',
      fuelEfficiency: 7.8,
      status: 'IN_USE',
      odometer: 18450.0,
      organizationId: org.id,
      photo: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
    },
  });

  const v3 = await prisma.vehicle.upsert({
    where: { registrationNo: 'DHK-METRO-KHA-5566' },
    update: {},
    create: {
      registrationNo: 'DHK-METRO-KHA-5566',
      make: 'Toyota',
      model: 'Corolla Hybrid Axio',
      year: 2023,
      type: 'Sedan',
      capacity: 4,
      fuelType: 'PETROL',
      fuelEfficiency: 18.5,
      status: 'AVAILABLE',
      odometer: 12100.0,
      organizationId: org.id,
      photo: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
    },
  });

  const v4 = await prisma.vehicle.upsert({
    where: { registrationNo: 'DHK-METRO-CHA-7788' },
    update: {},
    create: {
      registrationNo: 'DHK-METRO-CHA-7788',
      make: 'Hino',
      model: 'Liesse Corporate Shuttle',
      year: 2021,
      type: 'Bus',
      capacity: 28,
      fuelType: 'DIESEL',
      fuelEfficiency: 6.2,
      status: 'IN_MAINTENANCE',
      odometer: 62800.0,
      organizationId: org.id,
      photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
    },
  });
  console.log('🚘 4 Fleet Vehicles seeded (Available, In Use, In Maintenance)');

  // 6. Trips (Pending, In Progress, Completed)
  // Active Trip: Prado driven by Driver Karim for Sarah Smith
  const activeTrip = await prisma.trip.create({
    data: {
      requesterId: emp2.id,
      vehicleId: v2.id,
      driverId: driver2.id,
      fromOfficeId: 'office_hq',
      toOfficeId: 'office_gazipur',
      purpose: 'Urgent QA equipment inspection at Gazipur manufacturing facility',
      tripType: 'ROUND_TRIP',
      status: 'IN_PROGRESS',
      departureAt: new Date(),
      startedAt: new Date(Date.now() - 30 * 60 * 1000), // started 30 mins ago
      startOdometer: 18420.0,
      passengers: {
        create: [
          { name: 'Sarah Smith', email: 'sarah.smith@vms.com' },
          { name: 'David Miller (Lead Auditor)', email: 'david.audit@external.com' },
        ],
      },
    },
  });

  // Tracking breadcrumbs for active trip
  const breadcrumbs = [
    { lat: 23.7925, lng: 90.4078, speed: 0, heading: 0 },
    { lat: 23.8214, lng: 90.4112, speed: 45, heading: 10 },
    { lat: 23.8542, lng: 90.4128, speed: 58, heading: 12 },
    { lat: 23.8821, lng: 90.4132, speed: 52, heading: 15 },
  ];

  for (let i = 0; i < breadcrumbs.length; i++) {
    await prisma.trackingPoint.create({
      data: {
        tripId: activeTrip.id,
        driverId: driver2.id,
        latitude: breadcrumbs[i].lat,
        longitude: breadcrumbs[i].lng,
        speed: breadcrumbs[i].speed,
        heading: breadcrumbs[i].heading,
        timestamp: new Date(Date.now() - (breadcrumbs.length - i) * 5 * 60 * 1000),
      },
    });
  }

  // Pending Trip: John Doe requesting travel to Chittagong
  await prisma.trip.create({
    data: {
      requesterId: emp1.id,
      fromOfficeId: 'office_hq',
      toOfficeId: 'office_chittagong',
      purpose: 'Semi-annual logistics audit and warehouse container clearance review',
      tripType: 'ROUND_TRIP',
      status: 'PENDING',
      departureAt: new Date(Date.now() + 24 * 3600 * 1000), // tomorrow
      returnAt: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      passengers: {
        create: [{ name: 'Johnathan Doe', email: 'john.doe@vms.com' }],
      },
    },
  });

  // Completed Trip: Previous week
  await prisma.trip.create({
    data: {
      requesterId: emp1.id,
      vehicleId: v1.id,
      driverId: driver1.id,
      fromOfficeId: 'office_hq',
      toOfficeId: 'office_gazipur',
      purpose: 'Factory machinery routine checkup',
      tripType: 'ONE_WAY',
      status: 'COMPLETED',
      departureAt: new Date(Date.now() - 48 * 3600 * 1000),
      startedAt: new Date(Date.now() - 48 * 3600 * 1000),
      completedAt: new Date(Date.now() - 46 * 3600 * 1000),
      startOdometer: 34160.0,
      endOdometer: 34200.0,
      distanceCovered: 40.0,
    },
  });
  console.log('📋 Sample Trips created (1 In-Progress with GPS points, 1 Pending, 1 Completed)');

  // 7. Fuel Logs
  // Normal Log
  await prisma.fuelLog.create({
    data: {
      vehicleId: v1.id,
      driverId: driver1.id,
      odometerReading: 34200.0,
      fuelAdded: 38.0,
      pricePerLiter: 108.5,
      totalCost: 4123.0,
      receiptPhoto: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800',
      stationName: 'Padma Oil Co. Mohakhali Station',
      consumptionRate: 10.2,
      isAnomaly: false,
    },
  });

  // Anomaly Log (Excessive fuel billed vs km driven!)
  await prisma.fuelLog.create({
    data: {
      vehicleId: v2.id,
      driverId: driver2.id,
      odometerReading: 18450.0,
      fuelAdded: 60.0,
      pricePerLiter: 130.0,
      totalCost: 7800.0,
      receiptPhoto: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
      stationName: 'Jamuna Petroleum Airport Road',
      consumptionRate: 4.8, // Suspiciously low efficiency vs 7.8 rated!
      isAnomaly: true,
      notes: '🚨 Automated Anomaly Flag: Realized efficiency 4.8 km/L deviates by 38% from rated 7.8 km/L. Possible fuel siphoning.',
    },
  });
  console.log('⛽ Fuel Logs seeded (including 1 Anomaly Flag)');

  // 8. Maintenance Log
  await prisma.maintenanceLog.create({
    data: {
      vehicleId: v4.id,
      type: 'SCHEDULED',
      description: '60,000 km Major Service: Suspension replacement, full brake pad renewal, radiator flush.',
      cost: 45000.0,
      odometerAt: 62800.0,
      scheduledAt: new Date(),
      isCompleted: false,
      notes: 'Vehicle currently in Apex Central Workshop.',
    },
  });
  console.log('🔧 Maintenance record seeded');

  // 9. Real-Time Chat Conversations
  // Trip Thread for active trip
  const tripConv = await prisma.conversation.create({
    data: {
      tripId: activeTrip.id,
      subject: 'Trip Thread: Dhaka HQ → Gazipur Heavy Plant',
      type: 'TRIP_THREAD',
      participants: {
        create: [
          { userId: admin.id, lastReadAt: new Date() },
          { userId: emp2.id, lastReadAt: new Date(Date.now() - 5 * 60 * 1000) },
          { userId: driver2.userId, lastReadAt: new Date(Date.now() - 15 * 60 * 1000) },
        ],
      },
      messages: {
        create: [
          {
            senderId: admin.id,
            body: '✅ Trip Approved: Toyota Prado assigned with Driver Abdul Karim. Departs 09:30 AM.',
            messageType: 'SYSTEM_EVENT',
            isSystem: true,
            createdAt: new Date(Date.now() - 40 * 60 * 1000),
          },
          {
            senderId: emp2.id,
            body: 'Hi Admin & Karim Bhai, we have 2 extra boxes of inspection tools. Is luggage boot clear?',
            messageType: 'TEXT',
            createdAt: new Date(Date.now() - 25 * 60 * 1000),
          },
          {
            senderId: driver2.userId,
            body: 'Yes Madam, boot is completely empty and ready. I am waiting at Gate 2 reception.',
            messageType: 'TEXT',
            createdAt: new Date(Date.now() - 20 * 60 * 1000),
          },
          {
            senderId: admin.id,
            body: 'Noted. Keep GPS telemetry active during the whole transit.',
            messageType: 'TEXT',
            createdAt: new Date(Date.now() - 10 * 60 * 1000),
          },
        ],
      },
    },
  });

  // Incident Chat from Driver Rahim
  await prisma.conversation.create({
    data: {
      subject: '🚨 Low Tire Pressure Warning - Tongi Bypass',
      type: 'INCIDENT',
      participants: {
        create: [
          { userId: admin.id, lastReadAt: null }, // Unread for admin!
          { userId: driver1.userId, lastReadAt: new Date() },
        ],
      },
      messages: {
        create: [
          {
            senderId: driver1.userId,
            body: 'Admin sir, rear-right tire sensor is showing 22 PSI. Stopping at nearest gas station for air check.',
            messageType: 'TEXT',
            createdAt: new Date(Date.now() - 8 * 60 * 1000),
          },
        ],
      },
    },
  });

  // Employee General Support
  await prisma.conversation.create({
    data: {
      subject: 'Question on Weekend Outstation Allowance Policy',
      type: 'SUPPORT',
      participants: {
        create: [
          { userId: admin.id, lastReadAt: new Date() },
          { userId: emp1.id, lastReadAt: new Date() },
        ],
      },
      messages: {
        create: [
          {
            senderId: emp1.id,
            body: 'Hi Tanvir, does the Chittagong weekend trip include per-diem driver meals or handled via corporate fuel card?',
            messageType: 'TEXT',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
          {
            senderId: admin.id,
            body: 'Driver per-diem is automated through the VMS travel voucher system. You only need to verify odometer at departure.',
            messageType: 'TEXT',
            createdAt: new Date(Date.now() - 90 * 60 * 1000),
          },
        ],
      },
    },
  });
  console.log('💬 Sample Chat Conversations seeded (Trip Thread, Incident, Support)');

  console.log('✅ VMS Database Seeding Completed Successfully!');
  console.log('-------------------------------------------------------');
  console.log('🔑 Credentials for Testing:');
  console.log('   Admin:    admin@vms.com     | password: admin123');
  console.log('   Employee: john.doe@vms.com  | password: password123');
  console.log('   Driver:   driver.rahim@vms.com | password: driver123');
  console.log('-------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
