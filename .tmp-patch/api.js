const fs=require("fs");
const p="app/api/items-new/route.ts";
let s=fs.readFileSync(p,"utf8");

const a = `    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
    });
`;
if(!s.includes(a)) throw new Error("anchor");

const b = `    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    // The document pickers need to show what is actually on the floor —
    // received, sold and what is left — the way the old sale-billing screen
    // did. Off by default: every other caller only wants the catalogue.
    const withStock = searchParams.get("withStock") === "1";

    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
    });

    if (withStock && format !== "csv") {
      // Sales are written as negative quantities and purchases as positive
      // (see the SALE / SALE_RETURN writers in /api/sales-invoice), so the two
      // directions have to be summed separately to report them separately.
      const [received, issued] = await Promise.all([
        prisma.inventoryTxn.groupBy({
          by: ["itemId"],
          where: { companyId, qty: { gt: 0 } },
          _sum: { qty: true },
        }),
        prisma.inventoryTxn.groupBy({
          by: ["itemId"],
          where: { companyId, qty: { lt: 0 } },
          _sum: { qty: true },
        }),
      ]);

      const inMap = new Map<string, number>();
      for (const r of received) inMap.set(r.itemId, r._sum.qty ?? 0);
      const outMap = new Map<string, number>();
      for (const r of issued) outMap.set(r.itemId, Math.abs(r._sum.qty ?? 0));

      return NextResponse.json(
        items.map((i) => {
          const stockIn = inMap.get(i.id) ?? 0;
          const stockOut = outMap.get(i.id) ?? 0;
          return { ...i, stockIn, stockOut, stockBal: stockIn - stockOut };
        })
      );
    }
`;
s = s.replace(a, b);
fs.writeFileSync(p,s);
console.log("ok");
