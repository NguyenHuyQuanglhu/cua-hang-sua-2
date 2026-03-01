/**
 * Script để xóa sản phẩm test và thêm sản phẩm Pokemon mới
 * Bao gồm: Thẻ Pokemon và Thú nhồi bông Pokemon
 * Cấu trúc: Thùng -> Hộp -> Pack/Con
 * 
 * Chạy: npx tsx scripts/setup-pokemon-products.ts
 */

import 'dotenv/config';
import { getConnection } from '../src/db/connection';
import { v4 as uuidv4 } from 'uuid';

const POKEMON_STORE_ID = '795393B0-343C-4B90-B734-C4368311C7EB';

// Định nghĩa các loại sản phẩm Pokemon
const POKEMON_PRODUCTS = {
  // Thẻ Pokemon
  cards: [
    {
      name: 'Thẻ Pokemon Scarlet & Violet',
      description: 'Bộ thẻ Pokemon Scarlet & Violet mới nhất',
      category: 'Thẻ Pokemon',
      baseUnit: 'Pack',
      boxSize: 36, // 1 hộp = 36 pack
      cartonSize: 6, // 1 thùng = 6 hộp
      basePrice: 50000, // Giá 1 pack
      costPrice: 35000,
      imageUrl: 'https://images.pokemontcg.io/sv1/logo.png'
    },
    {
      name: 'Thẻ Pokemon Crown Zenith',
      description: 'Bộ thẻ Pokemon Crown Zenith đặc biệt',
      category: 'Thẻ Pokemon',
      baseUnit: 'Pack',
      boxSize: 36,
      cartonSize: 6,
      basePrice: 60000,
      costPrice: 42000,
      imageUrl: 'https://images.pokemontcg.io/swsh12pt5/logo.png'
    },
    {
      name: 'Thẻ Pokemon Paldean Fates',
      description: 'Bộ thẻ Pokemon Paldean Fates',
      category: 'Thẻ Pokemon',
      baseUnit: 'Pack',
      boxSize: 36,
      cartonSize: 6,
      basePrice: 55000,
      costPrice: 38500,
      imageUrl: 'https://images.pokemontcg.io/sv4pt5/logo.png'
    },
    {
      name: 'Thẻ Pokemon 151',
      description: 'Bộ thẻ Pokemon 151 kỷ niệm',
      category: 'Thẻ Pokemon',
      baseUnit: 'Pack',
      boxSize: 36,
      cartonSize: 4, // Bộ đặc biệt, 1 thùng = 4 hộp
      basePrice: 70000,
      costPrice: 49000,
      imageUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png'
    },
    {
      name: 'Thẻ Pokemon Obsidian Flames',
      description: 'Bộ thẻ Pokemon Obsidian Flames',
      category: 'Thẻ Pokemon',
      baseUnit: 'Pack',
      boxSize: 36,
      cartonSize: 6,
      basePrice: 50000,
      costPrice: 35000,
      imageUrl: 'https://images.pokemontcg.io/sv3/logo.png'
    }
  ],
  
  // Thú nhồi bông Pokemon
  plushies: [
    {
      name: 'Gấu bông Pikachu',
      description: 'Gấu bông Pikachu size trung (30cm)',
      category: 'Thú nhồi bông',
      baseUnit: 'Con',
      cartonSize: 12, // 1 thùng = 12 con
      basePrice: 150000,
      costPrice: 90000,
      imageUrl: 'https://archives.bulbagarden.net/media/upload/0/0d/025Pikachu.png'
    },
    {
      name: 'Gấu bông Charizard',
      description: 'Gấu bông Charizard size lớn (40cm)',
      category: 'Thú nhồi bông',
      baseUnit: 'Con',
      cartonSize: 8, // 1 thùng = 8 con
      basePrice: 250000,
      costPrice: 150000,
      imageUrl: 'https://archives.bulbagarden.net/media/upload/7/7e/006Charizard.png'
    },
    {
      name: 'Gấu bông Eevee',
      description: 'Gấu bông Eevee size trung (30cm)',
      category: 'Thú nhồi bông',
      baseUnit: 'Con',
      cartonSize: 12,
      basePrice: 140000,
      costPrice: 85000,
      imageUrl: 'https://archives.bulbagarden.net/media/upload/e/e2/133Eevee.png'
    },
    {
      name: 'Gấu bông Snorlax',
      description: 'Gấu bông Snorlax size lớn (50cm)',
      category: 'Thú nhồi bông',
      baseUnit: 'Con',
      cartonSize: 6, // Size lớn, 1 thùng = 6 con
      basePrice: 300000,
      costPrice: 180000,
      imageUrl: 'https://archives.bulbagarden.net/media/upload/f/fb/143Snorlax.png'
    },
    {
      name: 'Gấu bông Mewtwo',
      description: 'Gấu bông Mewtwo size trung (35cm)',
      category: 'Thú nhồi bông',
      baseUnit: 'Con',
      cartonSize: 10,
      basePrice: 200000,
      costPrice: 120000,
      imageUrl: 'https://archives.bulbagarden.net/media/upload/7/78/150Mewtwo.png'
    },
    {
      name: 'Gấu bông Gengar',
      description: 'Gấu bông Gengar size trung (30cm)',
      category: 'Thú nhồi bông',
      baseUnit: 'Con',
      cartonSize: 12,
      basePrice: 160000,
      costPrice: 95000,
      imageUrl: 'https://archives.bulbagarden.net/media/upload/c/c6/094Gengar.png'
    }
  ]
};

async function main() {
  const pool = await getConnection();

  try {
    console.log('🎮 Bắt đầu thiết lập sản phẩm Pokemon...\n');

    // 1. Xóa sản phẩm test
    console.log('🗑️  Xóa sản phẩm test...');
    const testProducts = await pool.request()
      .input('storeId', POKEMON_STORE_ID)
      .query(`
        SELECT id, name FROM Products 
        WHERE store_id = @storeId 
        AND (name LIKE '%test%' OR name LIKE '%Test%' OR name LIKE '%TEST%')
      `);

    if (testProducts.recordset.length > 0) {
      for (const product of testProducts.recordset) {
        // Xóa inventory trước
        await pool.request()
          .input('productId', product.id)
          .query('DELETE FROM ProductInventory WHERE ProductId = @productId');
        
        // Xóa product
        await pool.request()
          .input('productId', product.id)
          .query('DELETE FROM Products WHERE id = @productId');
        
        console.log(`   ✅ Đã xóa: ${product.name}`);
      }
    } else {
      console.log('   ℹ️  Không tìm thấy sản phẩm test nào');
    }

    // 2. Tạo hoặc lấy categories
    console.log('\n📁 Kiểm tra categories...');
    const categories = new Map<string, string>();
    
    for (const categoryName of ['Thẻ Pokemon', 'Thú nhồi bông']) {
      const existing = await pool.request()
        .input('storeId', POKEMON_STORE_ID)
        .input('name', categoryName)
        .query('SELECT id FROM Categories WHERE store_id = @storeId AND name = @name');
      
      if (existing.recordset.length > 0) {
        categories.set(categoryName, existing.recordset[0].id);
        console.log(`   ✅ Category "${categoryName}" đã tồn tại`);
      } else {
        const newId = uuidv4();
        await pool.request()
          .input('id', newId)
          .input('storeId', POKEMON_STORE_ID)
          .input('name', categoryName)
          .input('description', `Danh mục ${categoryName}`)
          .query(`
            INSERT INTO Categories (id, store_id, name, description, created_at, updated_at)
            VALUES (@id, @storeId, @name, @description, GETDATE(), GETDATE())
          `);
        categories.set(categoryName, newId);
        console.log(`   ✅ Đã tạo category "${categoryName}"`);
      }
    }

    // 3. Tạo units cho thẻ Pokemon
    console.log('\n📏 Tạo đơn vị cho thẻ Pokemon...');
    const cardUnits = await createCardUnits(pool);
    
    // 4. Tạo units cho thú nhồi bông
    console.log('\n🧸 Tạo đơn vị cho thú nhồi bông...');
    const plushyUnits = await createPlushyUnits(pool);

    // 5. Tạo sản phẩm thẻ Pokemon
    console.log('\n🃏 Tạo sản phẩm thẻ Pokemon...');
    for (const card of POKEMON_PRODUCTS.cards) {
      await createCardProduct(pool, card, categories.get(card.category)!, cardUnits);
    }

    // 6. Tạo sản phẩm thú nhồi bông
    console.log('\n🧸 Tạo sản phẩm thú nhồi bông...');
    for (const plushy of POKEMON_PRODUCTS.plushies) {
      await createPlushyProduct(pool, plushy, categories.get(plushy.category)!, plushyUnits);
    }

    console.log('\n✅ Hoàn thành thiết lập sản phẩm Pokemon!');
    console.log(`   - Đã tạo ${POKEMON_PRODUCTS.cards.length} loại thẻ Pokemon`);
    console.log(`   - Đã tạo ${POKEMON_PRODUCTS.plushies.length} loại thú nhồi bông`);

  } catch (error) {
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    await pool.close();
  }
}

// Tạo units cho thẻ Pokemon: Pack (base) -> Hộp -> Thùng
async function createCardUnits(pool: any) {
  const units: any = {};

  // Kiểm tra và tạo Pack (base unit)
  let packResult = await pool.request()
    .input('storeId', POKEMON_STORE_ID)
    .input('name', 'Pack')
    .query('SELECT id FROM Units WHERE store_id = @storeId AND name = @name');
  
  if (packResult.recordset.length > 0) {
    units.pack = packResult.recordset[0].id;
    console.log('   ✅ Đơn vị Pack đã tồn tại');
  } else {
    const packId = uuidv4();
    await pool.request()
      .input('id', packId)
      .input('storeId', POKEMON_STORE_ID)
      .input('name', 'Pack')
      .input('description', 'Đơn vị cơ bản - 1 gói thẻ')
      .query(`
        INSERT INTO Units (id, store_id, name, description, base_unit_id, conversion_factor, created_at, updated_at)
        VALUES (@id, @storeId, @name, @description, NULL, 1, GETDATE(), GETDATE())
      `);
    units.pack = packId;
    console.log('   ✅ Đã tạo đơn vị: Pack (base)');
  }

  // Kiểm tra và tạo Hộp (36 pack)
  let hopResult = await pool.request()
    .input('storeId', POKEMON_STORE_ID)
    .input('name', 'Hộp')
    .query('SELECT id FROM Units WHERE store_id = @storeId AND name = @name AND conversion_factor = 36');
  
  if (hopResult.recordset.length > 0) {
    units.hop = hopResult.recordset[0].id;
    console.log('   ✅ Đơn vị Hộp đã tồn tại');
  } else {
    const hopId = uuidv4();
    await pool.request()
      .input('id', hopId)
      .input('storeId', POKEMON_STORE_ID)
      .input('name', 'Hộp')
      .input('description', '1 hộp = 36 pack')
      .input('baseUnitId', units.pack)
      .input('conversionFactor', 36)
      .query(`
        INSERT INTO Units (id, store_id, name, description, base_unit_id, conversion_factor, created_at, updated_at)
        VALUES (@id, @storeId, @name, @description, @baseUnitId, @conversionFactor, GETDATE(), GETDATE())
      `);
    units.hop = hopId;
    console.log('   ✅ Đã tạo đơn vị: Hộp (36 pack)');
  }

  // Kiểm tra và tạo Thùng (216 pack)
  let thungResult = await pool.request()
    .input('storeId', POKEMON_STORE_ID)
    .input('name', 'Thùng')
    .query('SELECT id FROM Units WHERE store_id = @storeId AND name = @name AND conversion_factor = 216');
  
  if (thungResult.recordset.length > 0) {
    units.thung = thungResult.recordset[0].id;
    console.log('   ✅ Đơn vị Thùng đã tồn tại');
  } else {
    const thungId = uuidv4();
    await pool.request()
      .input('id', thungId)
      .input('storeId', POKEMON_STORE_ID)
      .input('name', 'Thùng')
      .input('description', '1 thùng = 6 hộp = 216 pack')
      .input('baseUnitId', units.pack)
      .input('conversionFactor', 216)
      .query(`
        INSERT INTO Units (id, store_id, name, description, base_unit_id, conversion_factor, created_at, updated_at)
        VALUES (@id, @storeId, @name, @description, @baseUnitId, @conversionFactor, GETDATE(), GETDATE())
      `);
    units.thung = thungId;
    console.log('   ✅ Đã tạo đơn vị: Thùng (6 hộp)');
  }

  return units;
}

// Tạo units cho thú nhồi bông: Con (base) -> Thùng
async function createPlushyUnits(pool: any) {
  const units: any = {};

  // Kiểm tra và tạo Con (base unit)
  let conResult = await pool.request()
    .input('storeId', POKEMON_STORE_ID)
    .input('name', 'Con')
    .query('SELECT id FROM Units WHERE store_id = @storeId AND name = @name');
  
  if (conResult.recordset.length > 0) {
    units.con = conResult.recordset[0].id;
    console.log('   ✅ Đơn vị Con đã tồn tại');
  } else {
    const conId = uuidv4();
    await pool.request()
      .input('id', conId)
      .input('storeId', POKEMON_STORE_ID)
      .input('name', 'Con')
      .input('description', 'Đơn vị cơ bản - 1 con gấu bông')
      .query(`
        INSERT INTO Units (id, store_id, name, description, base_unit_id, conversion_factor, created_at, updated_at)
        VALUES (@id, @storeId, @name, @description, NULL, 1, GETDATE(), GETDATE())
      `);
    units.con = conId;
    console.log('   ✅ Đã tạo đơn vị: Con (base)');
  }

  // Kiểm tra và tạo Thùng Gấu Bông
  let thungResult = await pool.request()
    .input('storeId', POKEMON_STORE_ID)
    .input('name', 'Thùng Gấu Bông')
    .query('SELECT id FROM Units WHERE store_id = @storeId AND name = @name');
  
  if (thungResult.recordset.length > 0) {
    units.thung = thungResult.recordset[0].id;
    console.log('   ✅ Đơn vị Thùng Gấu Bông đã tồn tại');
  } else {
    const thungId = uuidv4();
    await pool.request()
      .input('id', thungId)
      .input('storeId', POKEMON_STORE_ID)
      .input('name', 'Thùng Gấu Bông')
      .input('description', '1 thùng gấu bông (số lượng tùy loại)')
      .input('baseUnitId', units.con)
      .input('conversionFactor', 12) // Default 12 con
      .query(`
        INSERT INTO Units (id, store_id, name, description, base_unit_id, conversion_factor, created_at, updated_at)
        VALUES (@id, @storeId, @name, @description, @baseUnitId, @conversionFactor, GETDATE(), GETDATE())
      `);
    units.thung = thungId;
    console.log('   ✅ Đã tạo đơn vị: Thùng Gấu Bông (12 con)');
  }

  return units;
}

async function createCardProduct(pool: any, card: any, categoryId: string, units: any) {
  const productId = uuidv4();
  
  // Tạo product với unit_id là đơn vị base (Pack)
  await pool.request()
    .input('id', productId)
    .input('storeId', POKEMON_STORE_ID)
    .input('name', card.name)
    .input('description', card.description)
    .input('categoryId', categoryId)
    .input('unitId', units.pack)
    .input('price', card.basePrice)
    .input('costPrice', card.costPrice)
    .input('images', card.imageUrl)
    .input('status', 'active')
    .query(`
      INSERT INTO Products (id, store_id, name, description, category_id, unit_id, price, cost_price, images, status, created_at, updated_at)
      VALUES (@id, @storeId, @name, @description, @categoryId, @unitId, @price, @costPrice, @images, @status, GETDATE(), GETDATE())
    `);

  // Tạo inventory cho tất cả các đơn vị
  const inventoryData = [
    { unitId: units.pack, quantity: 100 }, // 100 pack
    { unitId: units.hop, quantity: 10 }, // 10 hộp
    { unitId: units.thung, quantity: 2 } // 2 thùng
  ];

  for (const inv of inventoryData) {
    await pool.request()
      .input('id', uuidv4())
      .input('productId', productId)
      .input('storeId', POKEMON_STORE_ID)
      .input('unitId', inv.unitId)
      .input('quantity', inv.quantity)
      .query(`
        INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
        VALUES (@id, @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
      `);
  }

  console.log(`   ✅ Đã tạo: ${card.name}`);
}

async function createPlushyProduct(pool: any, plushy: any, categoryId: string, units: any) {
  const productId = uuidv4();
  
  // Tạo product với unit_id là đơn vị base (Con)
  await pool.request()
    .input('id', productId)
    .input('storeId', POKEMON_STORE_ID)
    .input('name', plushy.name)
    .input('description', plushy.description)
    .input('categoryId', categoryId)
    .input('unitId', units.con)
    .input('price', plushy.basePrice)
    .input('costPrice', plushy.costPrice)
    .input('images', plushy.imageUrl)
    .input('status', 'active')
    .query(`
      INSERT INTO Products (id, store_id, name, description, category_id, unit_id, price, cost_price, images, status, created_at, updated_at)
      VALUES (@id, @storeId, @name, @description, @categoryId, @unitId, @price, @costPrice, @images, @status, GETDATE(), GETDATE())
    `);

  // Tạo inventory
  const inventoryData = [
    { unitId: units.con, quantity: 50 }, // 50 con
    { unitId: units.thung, quantity: 5 } // 5 thùng
  ];

  for (const inv of inventoryData) {
    await pool.request()
      .input('id', uuidv4())
      .input('productId', productId)
      .input('storeId', POKEMON_STORE_ID)
      .input('unitId', inv.unitId)
      .input('quantity', inv.quantity)
      .query(`
        INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
        VALUES (@id, @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
      `);
  }

  console.log(`   ✅ Đã tạo: ${plushy.name}`);
}

main().catch(console.error);
