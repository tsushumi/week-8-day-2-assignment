require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// [name, price in KES, category, description]
const PRODUCTS = [
  // Beverages
  ["Ketepa Tea 500g", 300, "Beverages", "Kenyan black tea leaves, rich and strong."],
  ["Tusker Lager 500ml", 250, "Beverages", "Kenya's classic premium lager."],
  ["Dormans Coffee 250g", 650, "Beverages", "Medium roast ground Kenyan coffee."],
  ["Minute Maid Mango 1L", 190, "Beverages", "Refreshing mango fruit drink."],
  ["Coca-Cola 2L", 210, "Beverages", "Chilled soda for the whole family."],
  ["Brookside Fresh Milk 1L", 130, "Beverages", "Fresh full-cream pasteurised milk."],
  ["Keringet Water 1.5L", 100, "Beverages", "Naturally still mineral water."],
  ["Ribena Blackcurrant 850ml", 480, "Beverages", "Blackcurrant concentrate squash."],
  // Groceries
  ["Pembe Maize Flour 2kg", 190, "Groceries", "Sifted maize meal for ugali."],
  ["Mumias Sugar 2kg", 340, "Groceries", "White refined sugar."],
  ["Pishori Rice 2kg", 520, "Groceries", "Fragrant long-grain rice."],
  ["Elianto Cooking Oil 3L", 1050, "Groceries", "Corn cooking oil, cholesterol free."],
  ["Exe Wheat Flour 2kg", 220, "Groceries", "All-purpose wheat flour."],
  ["Kenylon Spaghetti 500g", 140, "Groceries", "Durum wheat spaghetti."],
  ["Kasuku Beans 1kg", 260, "Groceries", "Dry rosecoco beans."],
  ["Kensalt Table Salt 1kg", 60, "Groceries", "Iodised table salt."],
  // Snacks
  ["Pringles Original 110g", 380, "Snacks", "Stackable salted potato crisps."],
  ["Krackles Tomato 100g", 80, "Snacks", "Crunchy tomato-flavoured crisps."],
  ["Cadbury Dairy Milk 80g", 170, "Snacks", "Smooth milk chocolate bar."],
  ["Britannia Digestive 400g", 260, "Snacks", "Wholemeal digestive biscuits."],
  ["Nuvita Roasted Peanuts 200g", 150, "Snacks", "Lightly salted roasted peanuts."],
  ["Mandazi Mix 500g", 120, "Snacks", "Ready-mix for fluffy mandazi."],
  ["Kuku Chips Masala 90g", 70, "Snacks", "Spicy masala potato chips."],
  ["Oreo Original 137g", 130, "Snacks", "Chocolate sandwich cookies."],
  // Household
  ["Omo Washing Powder 1kg", 420, "Household", "Tough stain removal for clothes."],
  ["Jik Bleach 750ml", 190, "Household", "Disinfecting household bleach."],
  ["Sunlight Dish Soap 750ml", 230, "Household", "Lemon dishwashing liquid."],
  ["Harpic Toilet Cleaner 500ml", 280, "Household", "Kills germs, removes limescale."],
  ["Sufuria Set 3-piece", 1800, "Household", "Aluminium cooking pots with lids."],
  ["Doom Insecticide 300ml", 450, "Household", "Fast-acting insect killer spray."],
  ["Kitchen Towels 2-pack", 200, "Household", "Absorbent paper kitchen rolls."],
  ["Plastic Basin 20L", 350, "Household", "Durable multipurpose basin."],
  // Personal Care
  ["Colgate Toothpaste 100ml", 160, "Personal Care", "Cavity protection toothpaste."],
  ["Nivea Body Lotion 400ml", 620, "Personal Care", "Deep moisture body lotion."],
  ["Dettol Soap 175g", 110, "Personal Care", "Antibacterial bathing soap."],
  ["Vaseline Petroleum Jelly 250ml", 260, "Personal Care", "Skin protecting jelly."],
  ["Always Ultra Pads 8s", 140, "Personal Care", "Ultra-thin sanitary pads."],
  ["Dove Roll-On 50ml", 290, "Personal Care", "Gentle 48h antiperspirant."],
  ["Pantene Shampoo 400ml", 540, "Personal Care", "Smooth and silky shampoo."],
  ["Gillette Razor 3-pack", 350, "Personal Care", "Comfortable disposable razors."],
  // Electronics
  ["Oraimo Earbuds FreePods", 2800, "Electronics", "Wireless earbuds with charging case."],
  ["Tecno Spark Charger 18W", 900, "Electronics", "Fast wall charger with cable."],
  ["Mi Power Bank 10000mAh", 2500, "Electronics", "Slim portable power bank."],
  ["JBL Go 3 Speaker", 4200, "Electronics", "Portable waterproof Bluetooth speaker."],
  ["Hisense 32in LED TV", 17500, "Electronics", "HD-ready digital television."],
  ["Philips LED Bulb 9W", 250, "Electronics", "Energy-saving warm white bulb."],
  ["Samsung 64GB MicroSD", 1200, "Electronics", "Memory card for phones and cameras."],
  ["Logitech Wireless Mouse", 1500, "Electronics", "Compact wireless optical mouse."],
  // Stationery
  ["Exercise Book 96pg (5-pack)", 280, "Stationery", "Ruled school exercise books."],
  ["Bic Cristal Pens 10s", 200, "Stationery", "Smooth-writing blue ballpoint pens."],
  ["A4 Printing Paper Ream", 650, "Stationery", "500 sheets of 80gsm paper."],
  ["Oxford Geometry Set", 320, "Stationery", "Compass, protractor and rulers."],
  ["Staedtler Pencils HB 12s", 240, "Stationery", "Quality graphite pencils."],
  ["Highlighter Set 4-colour", 260, "Stationery", "Bright, smear-free highlighters."],
  ["Hardcover Notebook A5", 450, "Stationery", "Hardback ruled notebook."],
  ["Scientific Calculator Casio", 1400, "Stationery", "Casio fx-82 scientific calculator."],
  // Fresh Produce
  ["Sukuma Wiki Bunch", 30, "Fresh Produce", "Fresh collard greens."],
  ["Tomatoes 1kg", 120, "Fresh Produce", "Ripe red tomatoes."],
  ["Onions 1kg", 110, "Fresh Produce", "Red onions, locally grown."],
  ["Avocados Hass 4-pack", 200, "Fresh Produce", "Creamy Hass avocados."],
  ["Bananas 1kg", 90, "Fresh Produce", "Sweet ripe bananas."],
  ["Irish Potatoes 2kg", 180, "Fresh Produce", "Fresh potatoes from Nyandarua."],
  ["Carrots 1kg", 100, "Fresh Produce", "Crisp orange carrots."],
  ["Sweet Pineapple Each", 150, "Fresh Produce", "Juicy Thika pineapple."],
];

async function main() {
  // Wipe and reset ids so the seed is repeatable.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Product" RESTART IDENTITY');

  const now = Date.now();
  const HOUR = 60 * 60 * 1000;

  // Spread createdAt over time so "newest first" ordering is meaningful.
  // The first item is the oldest, the last item is the newest.
  const data = PRODUCTS.map(([name, price, category, description], i) => ({
    name,
    price,
    category,
    description,
    createdAt: new Date(now - (PRODUCTS.length - i) * 6 * HOUR),
  }));

  const result = await prisma.product.createMany({ data });
  console.log(`Seeded ${result.count} products across ${new Set(PRODUCTS.map((p) => p[2])).size} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
