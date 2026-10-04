const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sampleStocks = [
  { symbol: 'AAPL', companyName: 'Apple Inc.', currentPrice: 185.50, previousClose: 182.20 },
  { symbol: 'MSFT', companyName: 'Microsoft Corporation', currentPrice: 420.10, previousClose: 415.80 },
  { symbol: 'NVDA', companyName: 'NVIDIA Corporation', currentPrice: 125.75, previousClose: 120.40 },
  { symbol: 'TSLA', companyName: 'Tesla, Inc.', currentPrice: 245.30, previousClose: 240.00 },
  { symbol: 'AMZN', companyName: 'Amazon.com, Inc.', currentPrice: 195.40, previousClose: 192.10 },
  { symbol: 'GOOGL', companyName: 'Alphabet Inc.', currentPrice: 178.60, previousClose: 175.50 }
];

async function main() {
  console.log('Seeding simulated stocks into TradeCore database...');

  for (let index = 0; index < sampleStocks.length; index = index + 1) {
    const stock = sampleStocks[index];
    await prisma.stock.upsert({
      where: { symbol: stock.symbol },
      update: {
        currentPrice: stock.currentPrice,
        previousClose: stock.previousClose
      },
      create: {
        symbol: stock.symbol,
        companyName: stock.companyName,
        currentPrice: stock.currentPrice,
        previousClose: stock.previousClose
      }
    });

    console.log(`Added or updated stock: ${stock.symbol} (${stock.companyName})`);
  }

  console.log('Seeding finished successfully!');
}

main()
  .catch((error) => {
    console.error('Error while seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });