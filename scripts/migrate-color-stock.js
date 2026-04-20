/**
 * Migration: Convert flat color[] + stock to colorStock[{ color, stock }]
 *
 * For each product that still has the legacy flat `color` array and/or `stock`
 * number, this script creates a `colorStock` array that distributes the total
 * stock evenly across all colors (remainder goes to the first color).
 *
 * Run once:
 *   node scripts/migrate-color-stock.js
 *
 * Safe to re-run: it skips products that already have colorStock populated.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.DB_URL || process.env.MONGO_URI;

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const collection = db.collection("products");

  // Find products that have the old `color` array but no `colorStock`
  const products = await collection.find({
    $or: [
      { colorStock: { $exists: false } },
      { colorStock: { $size: 0 } },
    ],
  }).toArray();

  console.log(`Found ${products.length} products to migrate`);

  let migrated = 0;

  for (const product of products) {
    const colors = product.color || [];
    const totalStock = product.stock || 0;

    let colorStock;

    if (colors.length === 0) {
      // No colors — create a single "default" entry with all the stock
      colorStock = [{ color: "default", stock: totalStock }];
    } else {
      // Distribute stock evenly across colors, remainder to first
      const perColor = Math.floor(totalStock / colors.length);
      const remainder = totalStock % colors.length;

      colorStock = colors.map((c, i) => ({
        color: c,
        stock: perColor + (i === 0 ? remainder : 0),
      }));
    }

    await collection.updateOne(
      { _id: product._id },
      {
        $set: { colorStock },
        $unset: { color: "", stock: "" }, // Remove legacy fields
      }
    );

    migrated++;
    console.log(`  Migrated: ${product.name} (${product.code}) → ${colorStock.length} color(s), total stock ${totalStock}`);
  }

  console.log(`\nDone. Migrated ${migrated} products.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
