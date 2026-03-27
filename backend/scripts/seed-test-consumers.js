/**
 * Seed Test Consumers for All Departments
 * Run: node scripts/seed-test-consumers.js
 *
 * Creates:
 *  - Electricity: user + consumer account E100, E101, E102 + unpaid bills
 *  - Gas:         consumers G100, G101
 *  - Water:       consumers W100, W101 + unpaid bills
 *  - Municipal:   consumers M100, M101
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool }  = require('pg');
const bcrypt    = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Seeding test consumers...\n');

    // ─── ELECTRICITY ────────────────────────────────────────────────────────
    const pwHash = await bcrypt.hash('Test@1234', 10);

    // Create 3 test electricity users (skip if exists)
    const elecUsers = [
      { full_name: 'Amit Kumar',   email: 'amit@test.com',   phone: '9876543210' },
      { full_name: 'Priya Singh',  email: 'priya@test.com',  phone: '9876543211' },
      { full_name: 'Rahul Sharma', email: 'rahul@test.com',  phone: '9876543212' },
    ];

    const elecUserIds = [];
    for (const u of elecUsers) {
      const existing = await client.query('SELECT id FROM electricity_users WHERE email = $1', [u.email]);
      if (existing.rows.length > 0) {
        elecUserIds.push(existing.rows[0].id);
        console.log(`  ⚡ Electricity user exists: ${u.email}`);
      } else {
        const r = await client.query(
          `INSERT INTO electricity_users (full_name, email, phone, password, is_active)
           VALUES ($1, $2, $3, $4, true) RETURNING id`,
          [u.full_name, u.email, u.phone, pwHash]
        );
        elecUserIds.push(r.rows[0].id);
        console.log(`  ⚡ Created electricity user: ${u.email}`);
      }
    }

    // Create consumer accounts E100, E101, E102
    const elecConsumers = [
      { number: 'E100', idx: 0, addr: '12 Gandhi Nagar, Pune', meter: 'MTR100001', category: 'residential' },
      { number: 'E101', idx: 1, addr: '45 Shivaji Road, Pune', meter: 'MTR100002', category: 'commercial' },
      { number: 'E102', idx: 2, addr: '78 MG Road, Pune',      meter: 'MTR100003', category: 'residential' },
    ];

    const elecAccountIds = {};
    for (const c of elecConsumers) {
      const existing = await client.query('SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1', [c.number]);
      if (existing.rows.length > 0) {
        elecAccountIds[c.number] = existing.rows[0].id;
        console.log(`  ⚡ Consumer account exists: ${c.number}`);
      } else {
        const r = await client.query(
          `INSERT INTO electricity_consumer_accounts
             (user_id, consumer_number, category, tariff_type, sanctioned_load, meter_number,
              connection_status, address_line1, city, state, pincode)
           VALUES ($1, $2, $3, 'residential', 5, $4, 'active', $5, 'Pune', 'Maharashtra', '411001')
           RETURNING id`,
          [elecUserIds[c.idx], c.number, c.category, c.meter, c.addr]
        );
        elecAccountIds[c.number] = r.rows[0].id;
        console.log(`  ⚡ Created consumer account: ${c.number}`);
      }
    }

    // Create unpaid bills for each account
    const elecBills = [
      { account: 'E100', bill_number: 'EBILL-2026-001', units: 250, energy: 1087.50, fixed: 50, tax: 137.25, total: 1274.75, month: '2026-02', due: '2026-03-15' },
      { account: 'E100', bill_number: 'EBILL-2026-002', units: 180, energy: 730.00, fixed: 50, tax:  93.00, total:  873.00, month: '2026-01', due: '2026-02-15' },
      { account: 'E101', bill_number: 'EBILL-2026-003', units: 420, energy: 2394.00, fixed: 200, tax: 311.28, total: 2905.28, month: '2026-02', due: '2026-03-15' },
      { account: 'E102', bill_number: 'EBILL-2026-004', units:  95, energy:  332.50, fixed:  50, tax:  45.90, total:  428.40, month: '2026-02', due: '2026-03-15' },
    ];

    for (const b of elecBills) {
      const existing = await client.query('SELECT id FROM electricity_bills WHERE bill_number = $1', [b.bill_number]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO electricity_bills
             (bill_number, consumer_account_id, billing_month, units_consumed, energy_charges,
              fixed_charges, tax_amount, total_amount, due_date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unpaid')`,
          [b.bill_number, elecAccountIds[b.account], b.month, b.units, b.energy, b.fixed, b.tax, b.total, b.due]
        );
        console.log(`  📄 Created bill: ${b.bill_number} → ₹${b.total}`);
      }
    }

    // ─── GAS ────────────────────────────────────────────────────────────────
    const gasConsumers = [
      { number: 'G100', name: 'Suresh Patel',   phone: '9123456789', email: 'suresh@test.com', addr: '5 Laxmi Nagar, Ahmedabad' },
      { number: 'G101', name: 'Meena Verma',    phone: '9123456790', email: 'meena@test.com',  addr: '22 Nehru Colony, Ahmedabad' },
    ];

    for (const c of gasConsumers) {
      const existing = await client.query('SELECT id FROM gas_consumers WHERE consumer_number = $1', [c.number]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO gas_consumers
             (consumer_number, full_name, phone, email, address, connection_status, connection_type)
           VALUES ($1, $2, $3, $4, $5, 'active', 'domestic')`,
          [c.number, c.name, c.phone, c.email, c.addr]
        );
        console.log(`  🔥 Created gas consumer: ${c.number} (${c.name})`);
      } else {
        console.log(`  🔥 Gas consumer exists: ${c.number}`);
      }
    }

    // ─── WATER ──────────────────────────────────────────────────────────────
    const waterConsumers = [
      { number: 'W100', name: 'Kavita Reddy',   mobile: '9234567890', email: 'kavita@test.com', addr: '8 Tank Road, Hyderabad', dues: 850.00 },
      { number: 'W101', name: 'Vikram Nair',    mobile: '9234567891', email: 'vikram@test.com', addr: '33 Water Colony, Hyderabad', dues: 1200.50 },
    ];

    const waterIds = {};
    for (const c of waterConsumers) {
      const existing = await client.query('SELECT id FROM water_consumers WHERE consumer_number = $1', [c.number]);
      if (existing.rows.length === 0) {
        const r = await client.query(
          `INSERT INTO water_consumers
             (consumer_number, full_name, mobile, email, address, connection_status, category, total_dues)
           VALUES ($1, $2, $3, $4, $5, 'active', 'domestic', $6) RETURNING id`,
          [c.number, c.name, c.mobile, c.email, c.addr, c.dues]
        );
        waterIds[c.number] = r.rows[0].id;
        console.log(`  💧 Created water consumer: ${c.number} (${c.name}) — dues ₹${c.dues}`);
      } else {
        waterIds[c.number] = existing.rows[0].id;
        console.log(`  💧 Water consumer exists: ${c.number}`);
      }
    }

    // Create water bills
    const waterBills = [
      { consumer: 'W100', bill_number: 'WB26001', amount: 850.00,  month: '2026-02', due: '2026-03-20' },
      { consumer: 'W101', bill_number: 'WB26002', amount: 1200.50, month: '2026-02', due: '2026-03-20' },
    ];

    for (const b of waterBills) {
      const existing = await client.query('SELECT id FROM water_bills WHERE bill_number = $1', [b.bill_number]).catch(() => ({ rows: [] }));
      if (existing.rows.length === 0) {
        try {
          await client.query('SAVEPOINT wb');
          await client.query(
            `INSERT INTO water_bills
               (bill_number, consumer_id, bill_month, water_charges, sewerage_charges, service_tax, total_amount, due_date, status)
             VALUES ($1, $2, $3, $4, 0, 0, $4, $5, 'unpaid')`,
            [b.bill_number, waterIds[b.consumer], b.month, b.amount, b.due]
          );
          await client.query('RELEASE SAVEPOINT wb');
          console.log(`  📄 Created water bill: ${b.bill_number} → ₹${b.amount}`);
        } catch (wbErr) {
          await client.query('ROLLBACK TO SAVEPOINT wb');
          console.log(`  ⚠️  Skipped water bill ${b.bill_number}: ${wbErr.message}`);
        }
      }
    }

    // ─── MUNICIPAL ──────────────────────────────────────────────────────────
    const municipalConsumers = [
      { number: 'M100', name: 'Rajan Joshi',   mobile: '9345678901', email: 'rajan@test.com',  addr: 'Plot 12, Sector 5, Jaipur' },
      { number: 'M101', name: 'Sunita Gupta',  mobile: '9345678902', email: 'sunita@test.com', addr: 'House 7, Ward 3, Jaipur' },
    ];

    for (const c of municipalConsumers) {
      const existing = await client.query('SELECT id FROM municipal_consumers WHERE consumer_number = $1', [c.number]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO municipal_consumers
             (consumer_number, full_name, mobile, email, ward, consumer_type, is_active)
           VALUES ($1, $2, $3, $4, 'Ward-3', 'resident', true)`,
          [c.number, c.name, c.mobile, c.email]
        );
        console.log(`  🏛️  Created municipal consumer: ${c.number} (${c.name})`);
      } else {
        console.log(`  🏛️  Municipal consumer exists: ${c.number}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Seeding complete!\n');
    console.log('Test Consumer IDs:');
    console.log('  ⚡ Electricity: E100, E101, E102');
    console.log('  🔥 Gas:         G100, G101');
    console.log('  💧 Water:       W100, W101');
    console.log('  🏛️  Municipal:   M100, M101');
    console.log('\nTest credentials (for consumer login):');
    console.log('  Email: amit@test.com / priya@test.com / rahul@test.com');
    console.log('  Password: Test@1234');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
