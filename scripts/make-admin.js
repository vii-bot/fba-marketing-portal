// Usage: npm run make-admin -- <email>
// Example: npm run make-admin -- rizamarsch@gmail.com
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: "admin" },
    select: { name: true, email: true, role: true },
  });

  console.log(`\n✓ ${user.name} (${user.email}) → role: ${user.role}`);
  console.log("  Log out and back in for the change to take effect.\n");
}

main()
  .catch((e) => {
    console.error("\n✗ Error:", e.message, "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
