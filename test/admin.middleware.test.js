import assert from "node:assert/strict";
import test from "node:test";

const { createAdminMiddleware } = await import("../middleware/admin.middleware.js");

async function invokeMiddleware(
  user = { id: "authenticated-user-id" },
  configuredAdminEmails = "",
  profileRole
) {
  const req = { user, profile: { role: profileRole } };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  let nextCalled = false;

  await createAdminMiddleware(configuredAdminEmails)(req, res, () => {
    nextCalled = true;
  });

  return { res, nextCalled };
}

test("allows an authenticated email explicitly configured by the server", async () => {
  const { res, nextCalled } = await invokeMiddleware(
    { id: "authenticated-user-id", email: "owner@example.test" },
    " OWNER@example.test, another@example.test "
  );

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

for (const role of ["admin", "super_admin"]) {
  test(`denies a non-allowlisted user with profile role ${role}`, async () => {
    const { res, nextCalled } = await invokeMiddleware(
      { id: "authenticated-user-id", email: "user@example.test" },
      "owner@example.test",
      role
    );

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: "Admin access required" });
  });
}

test("rejects requests without an authenticated user", async () => {
  const { res, nextCalled } = await invokeMiddleware(null);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Unauthorized" });
});

test("rejects an invalid authenticated user without an id", async () => {
  const { res, nextCalled } = await invokeMiddleware(
    { email: "owner@example.test" },
    "owner@example.test"
  );

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Unauthorized" });
});

test("denies authenticated users whose email is not configured", async () => {
  const { res, nextCalled } = await invokeMiddleware(
    { id: "authenticated-user-id", email: "user@example.test" },
    "owner@example.test"
  );

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: "Admin access required" });
});
