/** Interseptor facts shared by the hero and the showcase. Each one is checkable in the repo README. */
export const INTERSEPTOR = {
  version: "v2.16.0",
  repo: "https://github.com/Veyal/interseptor",
  releases: "https://github.com/Veyal/interseptor/releases/latest",
  issues: "https://github.com/Veyal/interseptor/issues",
  docs: "https://veyal.github.io/interseptor/",
  agentGuide: "https://veyal.github.io/interseptor/llms-full.txt",
  install: "go install github.com/Veyal/interseptor/cmd/interseptor@latest",
} as const;

export type DemoResponse = { status: string; ok: boolean; body: string; note: string };

/**
 * The copy ability Kirby gains when a tampered request turns into a finding.
 * Each one is picked to match the bug, the way Kirby becomes what he eats.
 */
export type CopyAbility = {
  /** Art in public/kirby/kirby-<id>.webp */
  id: "sword" | "ninja" | "hammer" | "spark" | "cutter" | "mirror" | "wing";
  name: string;
  /** Why this ability fits the finding, in one short sentence. */
  why: string;
};

/**
 * A request floating through the home hero. One value is editable in the
 * intercept tray, and `respond` decides what the pretend server sends back,
 * so visitors can try a classic tamper without any network traffic.
 */
export type DemoRequest = {
  id: string;
  method: "GET" | "POST" | "PUT";
  /** Short label shown on the fly. */
  label: string;
  field: string;
  initial: string;
  lines: (value: string) => string[];
  respond: (value: string) => DemoResponse;
  ability: CopyAbility;
};

export const DEMO_REQUESTS: DemoRequest[] = [
  {
    id: "profile",
    ability: { id: "sword", name: "Sword", why: "Promoted himself to admin and drew a sword." },
    method: "POST",
    label: "/api/profile",
    field: "role",
    initial: "user",
    lines: (v) => ["POST /api/profile HTTP/1.1", "Host: shop.example.com", "", `name=andrew&role=${v}`],
    respond: (v) =>
      v.trim() === "user"
        ? {
            status: "200 OK",
            ok: true,
            body: '{"name":"andrew","role":"user"}',
            note: "Normal answer. Change role to admin and forward it again.",
          }
        : {
            status: "200 OK",
            ok: false,
            body: `{"name":"andrew","role":"${v.trim()}"}`,
            note: "The server accepted a role sent by the browser. That's a privilege escalation finding.",
          },
  },
  {
    id: "orders",
    ability: { id: "ninja", name: "Ninja", why: "Slipped quietly into someone else's order." },
    method: "GET",
    label: "/api/orders/1042",
    field: "order id",
    initial: "1042",
    lines: (v) => [`GET /api/orders/${v} HTTP/1.1`, "Host: shop.example.com", "Cookie: session=andrew"],
    respond: (v) =>
      v.trim() === "1042"
        ? {
            status: "200 OK",
            ok: true,
            body: '{"id":1042,"customer":"andrew"}',
            note: "Your own order. Try 1043 and forward it again.",
          }
        : {
            status: "200 OK",
            ok: false,
            body: `{"id":${JSON.stringify(v.trim())},"customer":"someone.else@example.com"}`,
            note: "Someone else's order came back. That's an IDOR.",
          },
  },
  {
    id: "cart",
    ability: { id: "hammer", name: "Hammer", why: "Smashed the price down to whatever he liked." },
    method: "PUT",
    label: "/api/cart",
    field: "price",
    initial: "19.99",
    lines: (v) => ["PUT /api/cart HTTP/1.1", "Host: shop.example.com", "", `item=star-plush&qty=1&price=${v}`],
    respond: (v) => {
      const price = Number.parseFloat(v);
      return Number.isFinite(price) && price < 19.99
        ? {
            status: "200 OK",
            ok: false,
            body: `{"item":"star-plush","total":${price}}`,
            note: `The total came from the browser. You just bought a star plush for ${price}.`,
          }
        : {
            status: "200 OK",
            ok: true,
            body: '{"item":"star-plush","total":19.99}',
            note: "Full price. Lower the price and forward it again.",
          };
    },
  },
  {
    id: "debug",
    ability: { id: "spark", name: "Spark", why: "Shorted the server until it spilled a stack trace." },
    method: "GET",
    label: "/api/admin/stats",
    field: "debug",
    initial: "false",
    lines: (v) => [`GET /api/admin/stats?debug=${v} HTTP/1.1`, "Host: shop.example.com"],
    respond: (v) =>
      v.trim() === "false"
        ? {
            status: "403 Forbidden",
            ok: true,
            body: '{"error":"admins only"}',
            note: "Blocked, as it should be. Set debug to true and forward it again.",
          }
        : {
            status: "500 Internal Server Error",
            ok: false,
            body: "Traceback: db.query(\"SELECT * FROM stats\") at /srv/app/admin.py:88",
            note: "A debug flag leaked a stack trace. Small finding, useful clue.",
          },
  },
  {
    id: "login",
    ability: { id: "cutter", name: "Cutter", why: "One quote cut the query clean in half." },
    method: "POST",
    label: "/api/login",
    field: "user",
    initial: "andrew",
    lines: (v) => ["POST /api/login HTTP/1.1", "Host: shop.example.com", "", `user=${v}&pass=••••••••`],
    respond: (v) =>
      v.includes("'")
        ? {
            status: "500 Internal Server Error",
            ok: false,
            body: "SQL syntax error near ''' at line 1",
            note: "One quote broke the query. Worth a closer look for SQL injection.",
          }
        : {
            status: "302 Found",
            ok: true,
            body: "Location: /dashboard",
            note: "Logged in. Put a single quote in the username and forward it again.",
          },
  },
  {
    id: "user",
    ability: { id: "mirror", name: "Mirror", why: "Saw another user's profile reflected back." },
    method: "GET",
    label: "/api/users/42",
    field: "user id",
    initial: "42",
    lines: (v) => [`GET /api/users/${v} HTTP/1.1`, "Host: shop.example.com", "Cookie: session=andrew"],
    respond: (v) =>
      v.trim() === "42"
        ? {
            status: "200 OK",
            ok: true,
            body: '{"id":42,"name":"andrew"}',
            note: "Your own profile. Try 43 and forward it again.",
          }
        : {
            status: "200 OK",
            ok: false,
            body: `{"id":${JSON.stringify(v.trim())},"name":"sam","phone":"+1 555 0142"}`,
            note: "Another user's phone number came back. The ID was never checked against your session.",
          },
  },
  {
    id: "redirect",
    ability: { id: "wing", name: "Wing", why: "Flew visitors off to any site he chose." },
    method: "GET",
    label: "/login?next=/home",
    field: "next",
    initial: "/home",
    lines: (v) => [`GET /login?next=${v} HTTP/1.1`, "Host: shop.example.com"],
    respond: (v) =>
      /^(https?:)?\/\//i.test(v.trim())
        ? {
            status: "302 Found",
            ok: false,
            body: `Location: ${v.trim()}`,
            note: "The site redirects to any address you give it. That's an open redirect, handy for phishing.",
          }
        : {
            status: "302 Found",
            ok: true,
            body: `Location: ${v.trim() || "/"}`,
            note: "A normal redirect. Try https://evil.example and forward it again.",
          },
  },
];
