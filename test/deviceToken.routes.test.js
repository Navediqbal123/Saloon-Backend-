import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-placeholder";

let importNumber = 0;

async function loadDeviceTokenRouter({
  nodeEnvironment,
  deploymentEnvironment,
  productionOptIn,
}) {
  process.env.NODE_ENV = nodeEnvironment;

  if (deploymentEnvironment === undefined) {
    delete process.env.DEPLOYMENT_ENV;
  } else {
    process.env.DEPLOYMENT_ENV = deploymentEnvironment;
  }

  if (productionOptIn === undefined) {
    delete process.env.ENABLE_FCM_TEST_ENDPOINT;
  } else {
    process.env.ENABLE_FCM_TEST_ENDPOINT = productionOptIn;
  }

  const { default: router } = await import(
    `../routes/deviceToken.routes.js?test=${importNumber++}`
  );
  return router;
}

test("test-send is auth-protected and only registered in approved environments", async () => {
  const productionRouter = await loadDeviceTokenRouter({
    nodeEnvironment: "production",
  });
  assert.equal(
    productionRouter.stack.some((layer) => layer.route?.path === "/test-send"),
    false
  );

  const optedInProductionRouter = await loadDeviceTokenRouter({
    nodeEnvironment: "production",
    productionOptIn: "true",
  });
  const productionRoute = optedInProductionRouter.stack.find(
    (layer) => layer.route?.path === "/test-send"
  )?.route;
  assert.ok(productionRoute);
  assert.equal(productionRoute.methods.post, true);
  assert.deepEqual(
    productionRoute.stack.map((layer) => layer.name),
    ["authMiddleware", "sendTestNotification"]
  );

  const stagingRouter = await loadDeviceTokenRouter({
    nodeEnvironment: "production",
    deploymentEnvironment: "staging",
  });
  assert.ok(
    stagingRouter.stack.some((layer) => layer.route?.path === "/test-send")
  );

  const developmentRouter = await loadDeviceTokenRouter({
    nodeEnvironment: "development",
    productionOptIn: "true",
  });
  assert.equal(
    developmentRouter.stack.some((layer) => layer.route?.path === "/test-send"),
    false
  );
});
