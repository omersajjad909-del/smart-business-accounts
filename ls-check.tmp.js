(async () => {
  const key = process.env.LEMONSQUEEZY_API_KEY, store = process.env.LEMONSQUEEZY_STORE_ID;
  if (!key || !store) return console.log("NO LS CREDENTIALS IN ENV");
  const res = await fetch(`https://api.lemonsqueezy.com/v1/orders?filter[store_id]=${store}&page[size]=20&sort=-createdAt`, {
    headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return console.log("LS API error", res.status, await res.text());
  const j = await res.json();
  for (const r of j.data || []) {
    const a = r.attributes || {};
    console.log({ id: r.id, order_number: a.order_number, status: a.status, subtotal: a.subtotal, total: a.total, refunded: a.refunded, email: a.user_email, created: a.created_at });
  }
})();
