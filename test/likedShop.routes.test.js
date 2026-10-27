import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, test } from "node:test";

process.env.SUPABASE_URL = "http://127.0.0.1:0";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-placeholder";

const state = {
  barberStatus: 200,
  barberData: [{ id: "barber-shop-id" }],
  rpcStatus: 200,
  rpcData: 3,
  rpcRequest: null,
  barberRequestUrl: null,
};

const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;

  if (req.url?.startsWith("/rest/v1/barbers")) {
    state.barberRequestUrl = req.url;
    res.writeHead(state.barberStatus, {
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify(
        state.barberStatus >= 400
          ? { code: "TEST_ERROR", message: "Barber lookup failed" }
          : state.barberData
      )
    );
    return;
  }

  if (req.url === "/rest/v1/rpc/trimly_count_unique_shop_likes") {
    state.rpcRequest = JSON.parse(body);
    res.writeHead(state.rpcStatus, {
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify(
        state.rpcStatus >= 400
          ? { code: "TEST_ERROR", message: "Count query failed" }
          : state.rpcData
      )
    );
    return;
  }

  res.writeHead(404);
  res.end();
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;

const { getMyShopLikeCount } = await import(
  "../controllers/likedShopController.js?test=liked-shop-count"
);
const { default: router } = await import(
  "../routes/likedShopRoutes.js?test=liked-shop-count"
);

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function invoke(user, query = {}) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await getMyShopLikeCount({ user, query }, res);
  return res;
}

test("registers an authenticated shop-like-count route", () => {
  const route = router.stack.find(
    (layer) => layer.route?.path === "/my-shop/count"
  )?.route;

  assert.ok(route);
  assert.equal(route.methods.get, true);
  assert.deepEqual(
    route.stack.map((layer) => layer.name),
    ["authMiddleware", "getMyShopLikeCount"]
  );
  assert.ok(
    router.stack.some((layer) => layer.route?.path === "/"),
    "existing liked-shops route remains registered"
  );
});

test("rejects requests without an authenticated user", async () => {
  state.barberRequestUrl = null;

  const res = await invoke(null);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    message: "Authentication required",
  });
  assert.equal(state.barberRequestUrl, null);
});

test("counts unique likes for the authenticated barber's own shop", async () => {
  state.barberStatus = 200;
  state.barberData = [{ id: "barber-shop-id" }];
  state.rpcStatus = 200;
  state.rpcData = 3;
  state.rpcRequest = null;
  state.barberRequestUrl = null;

  const res = await invoke(
    { id: "authenticated-barber-user" },
    { shop_id: "caller-controlled-shop-id" }
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: { count: 3 } });
  assert.match(
    state.barberRequestUrl,
    /user_id=eq\.authenticated-barber-user/
  );
  assert.deepEqual(state.rpcRequest, { target_shop_id: "barber-shop-id" });
});

test("returns zero when the shop has no likes", async () => {
  state.barberStatus = 200;
  state.barberData = [{ id: "barber-shop-id" }];
  state.rpcStatus = 200;
  state.rpcData = 0;

  const res = await invoke({ id: "authenticated-barber-user" });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: { count: 0 } });
});

test("returns not found when the authenticated user has no barber profile", async () => {
  state.barberStatus = 200;
  state.barberData = [];

  const res = await invoke({ id: "customer-user" });

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    success: false,
    message: "Barber profile not found",
  });
});

test("returns an error when the barber lookup fails", async () => {
  state.barberStatus = 500;

  const res = await invoke({ id: "authenticated-barber-user" });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    message: "Failed to fetch shop likes count",
  });
});

test("returns an error when the unique-count query fails", async () => {
  state.barberStatus = 200;
  state.barberData = [{ id: "barber-shop-id" }];
  state.rpcStatus = 500;

  const res = await invoke({ id: "authenticated-barber-user" });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    message: "Failed to fetch shop likes count",
  });
});
