import{createRequire}from'module';const require=createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/seekerstream/db.ts
import pg from "pg";
function ssPool() {
  if (pool) return pool;
  const raw = process.env.DATABASE_ADMIN_URL;
  if (!raw) throw new Error("DATABASE_ADMIN_URL is not set");
  const u = new URL(raw);
  u.searchParams.delete("channel_binding");
  const url = u.toString();
  pool = new pg.Pool({
    connectionString: url,
    ssl: /sslmode=require|neon\.tech/.test(url) ? { rejectUnauthorized: false } : false,
    max: 3,
    connectionTimeoutMillis: 2e4,
    idleTimeoutMillis: 1e4
  });
  pool.on("error", (e) => console.error("[seekerstream db]", e.message));
  return pool;
}
async function withClient(fn) {
  const c = await ssPool().connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}
var pool;
var init_db = __esm({
  "src/seekerstream/db.ts"() {
    "use strict";
    pool = null;
  }
});

// src/seekerstream/schema.ts
async function ensureSchema(client) {
  await client.query(SEEKERSTREAM_SQL);
  await client.query(`do $$ begin
    if exists (select 1 from pg_roles where rolname = 'app_user') then
      revoke all on public.market_leads, public.market_sources, public.market_suppression, public.market_runs from app_user;
    end if; end $$;`);
}
var SEEKERSTREAM_SQL;
var init_schema = __esm({
  "src/seekerstream/schema.ts"() {
    "use strict";
    SEEKERSTREAM_SQL = `
create table if not exists public.market_leads (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,                 -- telegram | web_form | google_ads | meta_ads
  external_id    text not null unique,
  fingerprint    text not null unique,          -- normalised-text hash: one request = one lead
  channel        text,
  channel_title  text,
  permalink      text,
  author_handle  text,
  author_name    text,
  body           text not null,
  language       text,
  intent         text not null default 'rent',  -- rent | buy | share
  beds           int,
  budget         numeric(14,2),
  budget_period  text,
  areas          text[] not null default '{}',
  emirate        text,
  urgent         boolean not null default false,
  urgency_reason text,
  phone          text,                          -- first UAE mobile the person published
  name           text,                          -- from a form, when given
  email          text,
  consent        boolean not null default false,-- came through a form with explicit consent
  score          int not null default 50,
  reason         text,
  posted_at      timestamptz,
  detected_at    timestamptz not null default now(),
  claimed_org    uuid references public.organizations(id) on delete set null,
  claimed_by     uuid references users(id) on delete set null,
  claimed_at     timestamptz,
  contact_id     uuid references public.contacts(id) on delete set null,
  hidden         boolean not null default false
);
create index if not exists market_leads_feed on public.market_leads (detected_at desc) where not hidden;
create index if not exists market_leads_claims on public.market_leads (claimed_org, claimed_at desc);
create index if not exists market_leads_author on public.market_leads (author_handle, detected_at desc);

create table if not exists public.market_sources (
  id            text primary key,               -- e.g. telegram:rent_in_dubai
  kind          text not null,                  -- telegram
  handle        text not null,
  title         text,
  enabled       boolean not null default true,
  cursor        bigint not null default 0,      -- last message id read
  last_scan_at  timestamptz,
  last_error    text,
  scanned_total int not null default 0,
  leads_total   int not null default 0,
  created_at    timestamptz not null default now()
);

-- People who asked not to be contacted, and numbers on the Do-Not-Call registry.
create table if not exists public.market_suppression (
  phone     text primary key,
  reason    text,
  added_at  timestamptz not null default now()
);

create table if not exists public.market_runs (
  id          bigserial primary key,
  started_at  timestamptz not null default now(),
  ms          int,
  scanned     int not null default 0,
  leads       int not null default 0,
  note        text
);
`;
  }
});

// src/seekerstream/lexicon.json
var lexicon_default;
var init_lexicon = __esm({
  "src/seekerstream/lexicon.json"() {
    lexicon_default = {
      demand: [
        [
          "en",
          [
            [
              "\\blooking (?:for|to rent|to buy)\\b",
              "i",
              3
            ],
            [
              "\\b(?:i|we)(?:'m| am|'re| are) looking\\b",
              "i",
              3
            ],
            [
              "\\bin search of\\b",
              "i",
              3
            ],
            [
              "\\bsearch(?:ing)? for\\b",
              "i",
              3
            ],
            [
              "\\bwant(?:ed)? (?:a |an )?(?:room|bed ?space|bed|flat|apartment|studio|villa|partition)\\b",
              "i",
              3
            ],
            [
              "\\bwant(?:ing)? to (?:buy|rent|lease|purchase|move|relocate)\\b",
              "i",
              3
            ],
            [
              "\\blooking to (?:buy|rent|move|relocate)\\b",
              "i",
              3
            ],
            [
              "\\bneed (?:a )?bed ?space\\b",
              "i",
              3
            ],
            [
              "\\bhouse hunting\\b",
              "i",
              3
            ],
            [
              "\\bflat hunting\\b",
              "i",
              3
            ],
            [
              "\\bapartment hunting\\b",
              "i",
              3
            ],
            [
              "\\bany(?:one)? (?:know|got|have) a\\b",
              "i",
              2
            ],
            [
              "\\bwanted\\b",
              "i",
              2
            ],
            [
              "\\bseeking\\b",
              "i",
              2
            ],
            [
              "\\b(?:i|we) need (?:a|an|to find)\\b",
              "i",
              3
            ],
            [
              "\\bneed (?:a )?(?:place|flat|apartment|villa|studio|room)\\b",
              "i",
              3
            ],
            [
              "\\bwhere can (?:i|we) find\\b",
              "i",
              2
            ],
            [
              "\\bcan any(?:one|body) (?:recommend|suggest|help)\\b",
              "i",
              2
            ],
            [
              "\\brecommend(?:ations?)? for (?:a )?(?:place|area|building)\\b",
              "i",
              2
            ],
            [
              "\\b(?:moving|relocating|shifting) to (?:dubai|abu dhabi|sharjah|uae)\\b",
              "i",
              3
            ],
            [
              "\\b(?:moving|relocating) (?:there|over|next month|soon)\\b",
              "i",
              2
            ],
            [
              "\\bmy budget is\\b",
              "i",
              3
            ],
            [
              "\\bbudget (?:is |around |approx )?(?:aed|dhs?|\\d)",
              "i",
              2
            ],
            [
              "\\bany leads\\b",
              "i",
              2
            ],
            [
              "\\bhelp me find\\b",
              "i",
              3
            ],
            [
              "\\bdesperately? (?:need|looking)\\b",
              "i",
              3
            ],
            [
              "\\bnew to dubai\\b",
              "i",
              2
            ],
            [
              "\\bjust moved to\\b",
              "i",
              2
            ],
            [
              "\\barriving in (?:dubai|abu dhabi|uae)\\b",
              "i",
              2
            ],
            [
              "\\bstarting (?:a )?(?:new )?job in\\b",
              "i",
              1
            ],
            [
              "\\bmy (?:family|wife|husband|kids) and (?:i|we)\\b",
              "i",
              1
            ],
            [
              "\\bpreferably near\\b",
              "i",
              2
            ],
            [
              "\\bclose to (?:a )?(?:good )?school\\b",
              "i",
              2
            ],
            [
              "\\bschool for (?:my|our) (?:kid|child|son|daughter)\\b",
              "i",
              2
            ],
            [
              "\\bISO\\b",
              "i",
              1
            ],
            [
              "\\bsend me (?:options|details)\\b",
              "i",
              3
            ],
            [
              "\\bpreferably\\b",
              "i",
              1
            ],
            [
              "\\bmove[- ]in (?:date|by|from|on)\\b",
              "i",
              2
            ]
          ]
        ],
        [
          "ar",
          [
            [
              "\u0627\u0628\u062D\u062B \u0639\u0646",
              "i",
              3
            ],
            [
              "\u0627\u0628\u062D\u062B \u0639\u0646",
              "i",
              3
            ],
            [
              "\u0646\u0628\u062D\u062B \u0639\u0646",
              "i",
              3
            ],
            [
              "\u0645\u0637\u0644\u0648\u0628",
              "i",
              3
            ],
            [
              "\u0627\u062F\u0648\u0631 \u0639\u0644\u064A",
              "i",
              3
            ],
            [
              "\u0627\u062F\u0648\u0631 \u0639\u0644\u064A",
              "i",
              3
            ],
            [
              "\u0627\u0628\u063A\u064A",
              "i",
              3
            ],
            [
              "\u0627\u0628\u063A\u064A",
              "i",
              3
            ],
            [
              "\u0627\u0628\u064A",
              "i",
              2
            ],
            [
              "\u0645\u062D\u062A\u0627\u062C",
              "i",
              3
            ],
            [
              "\u0645\u062D\u062A\u0627\u062C\u0647",
              "i",
              3
            ],
            [
              "\u0628\u062F\u064A",
              "i",
              3
            ],
            [
              "\u0639\u0627\u064A\u0632",
              "i",
              3
            ],
            [
              "\u0639\u0627\u0648\u0632",
              "i",
              3
            ],
            [
              "\u0627\u0631\u064A\u062F",
              "i",
              2
            ],
            [
              "\u0627\u0631\u064A\u062F",
              "i",
              2
            ],
            [
              "\u0627\u0628\u062D\u062B",
              "i",
              2
            ],
            [
              "\u0645\u0646 \u064A\u0639\u0631\u0641",
              "i",
              2
            ],
            [
              "\u0641\u064A \u062D\u062F \u064A\u0639\u0631\u0641",
              "i",
              2
            ],
            [
              "\u064A\u0627 \u062C\u0645\u0627\u0639\u0647",
              "i",
              1
            ],
            [
              "\u0645\u064A\u0632\u0627\u0646\u064A\u062A\u064A",
              "i",
              3
            ],
            [
              "\u0645\u064A\u0632\u0627\u0646\u064A\u0647",
              "i",
              2
            ],
            [
              "\u0633\u0627\u0646\u062A\u0642\u0644",
              "i",
              2
            ],
            [
              "\u0627\u0646\u062A\u0642\u0644 \u0627\u0644\u064A",
              "i",
              2
            ],
            [
              "\u0642\u0631\u064A\u0628 \u0645\u0646 \u0645\u062F\u0631\u0633\u0647",
              "i",
              2
            ],
            [
              "\u0644\u0644\u0639\u0627\u0626\u0644\u0647",
              "i",
              1
            ]
          ]
        ],
        [
          "hi",
          [
            [
              "\u0922\u0942\u0902\u0922 \u0930\u0939\u093E",
              "i",
              3
            ],
            [
              "\u0922\u0942\u0902\u0922 \u0930\u0939\u0940",
              "i",
              3
            ],
            [
              "\u0924\u0932\u093E\u0936",
              "i",
              3
            ],
            [
              "\u091A\u093E\u0939\u093F\u090F",
              "i",
              3
            ],
            [
              "\u0915\u093F\u0930\u093E\u090F \u092A\u0930",
              "i",
              2
            ],
            [
              "\u092E\u0915\u093E\u0928 \u091A\u093E\u0939\u093F\u090F",
              "i",
              3
            ],
            [
              "\u092B\u094D\u0932\u0948\u091F \u091A\u093E\u0939\u093F\u090F",
              "i",
              3
            ],
            [
              "\u092C\u091C\u091F",
              "i",
              2
            ],
            [
              "\u0915\u094B\u0908 \u091C\u093E\u0928\u0924\u093E \u0939\u0948",
              "i",
              2
            ]
          ]
        ],
        [
          "hi_latn",
          [
            [
              "\\bchahiye\\b",
              "i",
              3
            ],
            [
              "\\bchaiye\\b",
              "i",
              3
            ],
            [
              "\\bchahiya\\b",
              "i",
              3
            ],
            [
              "\\bdhoond\\w*\\b",
              "i",
              3
            ],
            [
              "\\bdhundh\\w*\\b",
              "i",
              3
            ],
            [
              "\\btalash\\b",
              "i",
              3
            ],
            [
              "\\bkiraye? (?:pe|par)\\b",
              "i",
              2
            ],
            [
              "\\bmakan\\b",
              "i",
              1
            ],
            [
              "\\bghar chahiye\\b",
              "i",
              3
            ],
            [
              "\\bkoi janta hai\\b",
              "i",
              2
            ],
            [
              "\\bbhai koi\\b",
              "i",
              1
            ]
          ]
        ],
        [
          "ur",
          [
            [
              "\u062A\u0644\u0627\u0634",
              "i",
              3
            ],
            [
              "\u0686\u0627\u06C1\u064A\u06D2",
              "i",
              3
            ],
            [
              "\u0686\u0627\u06C1\u0626\u06D2",
              "i",
              3
            ],
            [
              "\u0688\u06BE\u0648\u0646\u0688 \u0631\u06C1\u0627",
              "i",
              3
            ],
            [
              "\u0643\u0631\u0627\u064A\u06C1 \u067E\u0631",
              "i",
              2
            ],
            [
              "\u0645\u0643\u0627\u0646 \u0686\u0627\u06C1\u064A\u06D2",
              "i",
              3
            ],
            [
              "\u0643\u0648\u0626\u064A \u062C\u0627\u0646\u062A\u0627",
              "i",
              2
            ]
          ]
        ],
        [
          "ru",
          [
            [
              "\\b\u0438\u0449\u0443\\b",
              "i",
              3
            ],
            [
              "\\b\u0438\u0449\u0435\u043C\\b",
              "i",
              3
            ],
            [
              "\\b\u0441\u043D\u0438\u043C\u0443\\b",
              "i",
              3
            ],
            [
              "\\b\u0441\u043D\u044F\u0442\u044C\\b",
              "i",
              2
            ],
            [
              "\\b\u0430\u0440\u0435\u043D\u0434\u043E\u0432\u0430\u0442\u044C\\b",
              "i",
              2
            ],
            [
              "\\b\u0432 \u043F\u043E\u0438\u0441\u043A\u0435\\b",
              "i",
              3
            ],
            [
              "\\b\u043F\u043E\u0434\u0441\u043A\u0430\u0436\u0438\u0442\u0435\\b",
              "i",
              2
            ],
            [
              "\\b\u043F\u043E\u0441\u043E\u0432\u0435\u0442\u0443\u0439\u0442\u0435\\b",
              "i",
              2
            ],
            [
              "\\b\u043D\u0443\u0436\u043D\u0430 \u043A\u0432\u0430\u0440\u0442\u0438\u0440\u0430\\b",
              "i",
              3
            ],
            [
              "\\b\u043D\u0443\u0436\u0435\u043D \u0434\u043E\u043C\\b",
              "i",
              3
            ],
            [
              "\\b\u043D\u0443\u0436\u0435\u043D\\b",
              "i",
              2
            ],
            [
              "\\b\u043D\u0443\u0436\u043D\u0430\\b",
              "i",
              2
            ],
            [
              "\\b\u043D\u0443\u0436\u043D\u043E\\b",
              "i",
              1
            ],
            [
              "\\b\u0440\u0430\u0441\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u044E\\b",
              "i",
              2
            ],
            [
              "\\b\u0440\u0430\u0441\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0435\u043C\\b",
              "i",
              2
            ],
            [
              "\\b\u043F\u0435\u0440\u0435\u0435\u0437\u0436\u0430\u044E\\b",
              "i",
              3
            ],
            [
              "\\b\u043F\u0435\u0440\u0435\u0435\u0437\u0436\u0430\u0435\u043C\\b",
              "i",
              3
            ],
            [
              "\\b\u0431\u044E\u0434\u0436\u0435\u0442\\b",
              "i",
              2
            ],
            [
              "\\b\u043A\u0442\u043E \u0437\u043D\u0430\u0435\u0442\\b",
              "i",
              2
            ],
            [
              "\\b\u0440\u044F\u0434\u043E\u043C \u0441\u043E \u0448\u043A\u043E\u043B\u043E\u0439\\b",
              "i",
              2
            ],
            [
              "\\b\u0436\u0435\u043B\u0430\u0442\u0435\u043B\u044C\u043D\u043E\\b",
              "i",
              2
            ],
            [
              "\\b\u043C\u043E\u0436\u0435\u043C \u0437\u0430\u0435\u0445\u0430\u0442\u044C\\b",
              "i",
              3
            ],
            [
              "\\b\u0437\u0430\u0435\u0437\u0434\\b",
              "i",
              2
            ],
            [
              "\\b\u0437\u0430\u0441\u0435\u043B\u0435\u043D\u0438\u0435\\b",
              "i",
              1
            ],
            [
              "\\b\u0440\u0430\u0441\u0441\u043C\u043E\u0442\u0440(?:\u044E|\u0438\u043C|\u0438\u043C \u0432\u0441\u0435)\\b",
              "i",
              2
            ],
            [
              "\\b\u0441 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F\u043C\u0438\\b",
              "i",
              2
            ],
            [
              "\\b\u043F\u0440\u0438\u0441\u044B\u043B\u0430\u0439\u0442\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B\\b",
              "i",
              3
            ],
            [
              "\\b\u0431\u0443\u0434\u0443 (?:\u0440\u0430\u0434|\u0440\u0430\u0434\u0430|\u0431\u043B\u0430\u0433\u043E\u0434\u0430\u0440)\\w*\\b",
              "i",
              2
            ]
          ]
        ],
        [
          "tl",
          [
            [
              "\\bnaghahanap\\b",
              "i",
              3
            ],
            [
              "\\bhanap\\b",
              "i",
              2
            ],
            [
              "\\bkailangan ko\\b",
              "i",
              3
            ],
            [
              "\\bkailangan namin\\b",
              "i",
              3
            ],
            [
              "\\bmay alam ba\\b",
              "i",
              2
            ],
            [
              "\\bsana may\\b",
              "i",
              1
            ],
            [
              "\\bmalapit sa\\b",
              "i",
              1
            ],
            [
              "\\bbudget ko\\b",
              "i",
              3
            ]
          ]
        ],
        [
          "fr",
          [
            [
              "\\bje cherche\\b",
              "i",
              3
            ],
            [
              "\\bnous cherchons\\b",
              "i",
              3
            ],
            [
              "\\b\xE0 la recherche d\\b",
              "i",
              3
            ],
            [
              "\\bj'ai besoin d\\b",
              "i",
              3
            ],
            [
              "\\bje d\xE9m\xE9nage\\b",
              "i",
              3
            ],
            [
              "\\bqui conna\xEEt\\b",
              "i",
              2
            ],
            [
              "\\bmon budget\\b",
              "i",
              3
            ],
            [
              "\\bproche d'une \xE9cole\\b",
              "i",
              2
            ]
          ]
        ],
        [
          "fa",
          [
            [
              "\u062F\u0646\u0628\u0627\u0644",
              "i",
              3
            ],
            [
              "\u0645\u064A\u200C\u062E\u0648\u0627\u0647\u0645",
              "i",
              2
            ],
            [
              "\u0645\u064A\u062E\u0648\u0627\u0647\u0645",
              "i",
              2
            ],
            [
              "\u0646\u064A\u0627\u0632 \u062F\u0627\u0631\u0645",
              "i",
              3
            ],
            [
              "\u0627\u062C\u0627\u0631\u0647 \u0645\u064A\u200C\u062E\u0648\u0627\u0647\u0645",
              "i",
              3
            ]
          ]
        ]
      ],
      supply: [
        [
          "\\bfor rent\\b",
          "i",
          2
        ],
        [
          "\\bfor sale\\b",
          "i",
          2
        ],
        [
          "\\bto let\\b",
          "i",
          2
        ],
        [
          "\\bavailable (?:now|for rent|units?|from)\\b",
          "i",
          3
        ],
        [
          "\\bchiller free\\b",
          "i",
          3
        ],
        [
          "\\bno commission\\b",
          "i",
          3
        ],
        [
          "\\bdirect from (?:the )?owner\\b",
          "i",
          3
        ],
        [
          "\\bbrand new\\b",
          "i",
          2
        ],
        [
          "\\bready to move in\\b",
          "i",
          2
        ],
        [
          "\\bwhatsapp me\\b",
          "i",
          2
        ],
        [
          "\\bdm for (?:details|price|more)\\b",
          "i",
          3
        ],
        [
          "\\bcall (?:now|us|me) (?:on|at|for)\\b",
          "i",
          3
        ],
        [
          "\\bcontact us\\b",
          "i",
          3
        ],
        [
          "\\bfor (?:more )?(?:details|inquiries|viewing)[, ]*(?:call|contact|whatsapp)",
          "i",
          3
        ],
        [
          "\\b\\d+\\s*cheques?\\b",
          "i",
          3
        ],
        [
          "\\bpay(?:able)? in \\d+\\b",
          "i",
          3
        ],
        [
          "\\baed\\s?[\\d,]{4,}\\s*(?:/|per )?\\s*(?:year|yr|annum|month)\\b",
          "i",
          3
        ],
        [
          "\\b[\\d,]{5,}\\s*aed\\b",
          "i",
          2
        ],
        [
          "\\bsq\\.?\\s?ft\\b",
          "i",
          2
        ],
        [
          "\\bsqft\\b",
          "i",
          2
        ],
        [
          "\\bbuilt[- ]up area\\b",
          "i",
          3
        ],
        [
          "\\bfloor plan\\b",
          "i",
          2
        ],
        [
          "\\bbrochure\\b",
          "i",
          2
        ],
        [
          "\\boff[- ]plan\\b",
          "i",
          3
        ],
        [
          "\\bhandover\\b",
          "i",
          2
        ],
        [
          "\\bpayment plan\\b",
          "i",
          3
        ],
        [
          "\\bbook (?:now|your)\\b",
          "i",
          3
        ],
        [
          "\\blimited units\\b",
          "i",
          3
        ],
        [
          "\\bstarting from (?:aed|just|only)\\b",
          "i",
          3
        ],
        [
          "\\bexclusive (?:listing|unit|offer)\\b",
          "i",
          3
        ],
        [
          "\\bhot deal\\b",
          "i",
          3
        ],
        [
          "\\bprime location\\b",
          "i",
          2
        ],
        [
          "\\bworld[- ]class amenities\\b",
          "i",
          3
        ],
        [
          "\\bstate[- ]of[- ]the[- ]art\\b",
          "i",
          2
        ],
        [
          "\\bfully (?:furnished|fitted) (?:apartment|villa|unit)\\b",
          "i",
          1
        ],
        [
          "\\bvacant (?:now|on transfer)\\b",
          "i",
          3
        ],
        [
          "\\bROI\\b",
          "i",
          2
        ],
        [
          "\\bgolden visa eligible\\b",
          "i",
          2
        ],
        [
          "\\bRERA\\b",
          "i",
          2
        ],
        [
          "\\bBRN\\b",
          "i",
          2
        ],
        [
          "\\bpermit (?:no|number)\\b",
          "i",
          3
        ],
        [
          "\u0644\u0644\u0627\u064A\u062C\u0627\u0631",
          "i",
          2
        ],
        [
          "\u0644\u0644\u0628\u064A\u0639",
          "i",
          2
        ],
        [
          "\u0645\u062A\u0648\u0641\u0631",
          "i",
          3
        ],
        [
          "\u0644\u0644\u062A\u0648\u0627\u0635\u0644",
          "i",
          3
        ],
        [
          "\u0627\u062A\u0635\u0644",
          "i",
          2
        ],
        [
          "\u0628\u062F\u0648\u0646 \u0639\u0645\u0648\u0644\u0647",
          "i",
          3
        ],
        [
          "\u0645\u0646 \u0627\u0644\u0645\u0627\u0644\u0643 \u0645\u0628\u0627\u0634\u0631\u0647",
          "i",
          3
        ],
        [
          "\u062A\u0633\u0644\u064A\u0645 \u0641\u0648\u0631\u064A",
          "i",
          3
        ],
        [
          "\u062E\u0637\u0647 \u0633\u062F\u0627\u062F",
          "i",
          3
        ],
        [
          "\u0639\u0631\u0636 \u062E\u0627\u0635",
          "i",
          3
        ],
        [
          "\u0645\u0648\u0642\u0639 \u0645\u0645\u064A\u0632",
          "i",
          2
        ],
        [
          "\u0634\u064A\u0643\u0627\u062A",
          "i",
          3
        ],
        [
          "\u0633\u0648\u0628\u0631 \u062F\u064A\u0644\u0648\u0643\u0633",
          "i",
          2
        ],
        [
          "\\b\u0441\u0434\u0430\u0435\u0442\u0441\u044F\\b",
          "i",
          3
        ],
        [
          "\\b\u043F\u0440\u043E\u0434\u0430\u0435\u0442\u0441\u044F\\b",
          "i",
          3
        ],
        [
          "\\b\u0437\u0432\u043E\u043D\u0438\u0442\u0435\\b",
          "i",
          2
        ],
        [
          "\\b\u0431\u0435\u0437 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438\\b",
          "i",
          3
        ],
        [
          "\\b\u0440\u0430\u0441\u0441\u0440\u043E\u0447\u043A\u0430\\b",
          "i",
          3
        ],
        [
          "\\b\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\\b",
          "i",
          3
        ],
        [
          "\\b\u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0438\\b",
          "i",
          3
        ],
        [
          "\\b\u043F\u043E\u0434\u0431\u0435\u0440\u0435\u043C\\b",
          "i",
          3
        ],
        [
          "\\b\u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u0431\u044E\u0434\u0436\u0435\u0442\\b",
          "i",
          3
        ],
        [
          "\\b\u0443 \u043D\u0430\u0441 \u0435\u0441\u0442\u044C\\b",
          "i",
          2
        ],
        [
          "\\b\u0434\u0435\u043F\u043E\u0437\u0438\u0442\\b",
          "i",
          2
        ],
        [
          "\\b\u043A\u043E\u043C\u0438\u0441\u0441\u0438\\w*\\b",
          "i",
          2
        ],
        [
          "\\b(?:\u0432\u0441\u0435 )?\u0441\u0447\u0435\u0442\u0430 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B\\b",
          "i",
          3
        ],
        [
          "\\b\u0432\u0441\u0435 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E\\b",
          "i",
          2
        ],
        [
          "\\b\u0437\u0430\u0441\u0435\u043B\u0435\u043D\u0438\\w*\\b",
          "i",
          2
        ],
        [
          "\\b\u043F\u043E\u0441\u0443\u0442\u043E\u0447\u043D\u043E\\b",
          "i",
          2
        ],
        [
          "\\b\u0441\u0432\u043E\u0431\u043E\u0434\u043D\u0430\\b",
          "i",
          2
        ],
        [
          "\\b\u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\\w*\\b",
          "i",
          2
        ],
        [
          "\\b\u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0448\u0430\u043D\u0441\\b",
          "i",
          3
        ],
        [
          "\\b\u043C\u0435\u0441\u0442\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\\b",
          "i",
          3
        ],
        [
          "\\b\u043A\u043E\u0439\u043A\u043E-?\u043C\u0435\u0441\u0442\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\\b",
          "i",
          3
        ],
        [
          "\\bpaupahan\\b",
          "i",
          3
        ],
        [
          "\\bnagpapaupa\\b",
          "i",
          3
        ],
        [
          "\\b\xE0 louer\\b",
          "i",
          2
        ],
        [
          "\\b\xE0 vendre\\b",
          "i",
          2
        ],
        [
          "\u0627\u0633\u0639\u0627\u0631 \u0645\u062A\u0641\u0627\u0648\u062A\u0647",
          "i",
          3
        ],
        [
          "\u0627\u0633\u0639\u0627\u0631 \u0645\u062E\u062A\u0644\u0641\u0647",
          "i",
          3
        ],
        [
          "\u0645\u0633\u0627\u062D\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0647",
          "i",
          3
        ],
        [
          "\u0645\u0633\u0627\u062D\u0627\u062A \u0645\u062A\u0641\u0627\u0648\u062A\u0647",
          "i",
          3
        ],
        [
          "\u0627\u0633\u0639\u0627\u0631 \u0648\u0645\u0633\u0627\u062D\u0627\u062A",
          "i",
          3
        ],
        [
          "\u0645\u0648\u0627\u0642\u0639 \u0645\u062E\u062A\u0644\u0641\u0647",
          "i",
          2
        ],
        [
          "\\bdistress(?:ed)?\\b",
          "i",
          3
        ],
        [
          "\\bbelow (?:op|original price)\\b",
          "i",
          3
        ],
        [
          "\\bop (?:or|and) below\\b",
          "i",
          3
        ],
        [
          "\\bpost[- ]handover\\b",
          "i",
          3
        ],
        [
          "\\bresale\\b",
          "i",
          2
        ],
        [
          "\\bbelow market\\b",
          "i",
          3
        ],
        [
          "\\bvarious (?:prices|sizes|locations|areas)\\b",
          "i",
          3
        ],
        [
          "\\bdifferent (?:prices|sizes|locations)\\b",
          "i",
          3
        ],
        [
          "\\ball (?:areas|sizes|budgets)\\b",
          "i",
          2
        ],
        [
          "\u0645\u0646 \u0627\u0644\u0645\u0627\u0644\u0643 \u0645\u0628\u0627\u0634\u0631",
          "i",
          2
        ],
        [
          "\\b\u0434\u043E\u0441\u0442\u0443\u043F\u043D[\u0430\u043E\u044B\u044F]\\w*",
          "i",
          3
        ],
        [
          "\\b\u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u043C\\b",
          "i",
          3
        ],
        [
          "\\b\u0441\u0432\u043E\u0431\u043E\u0434\u043D[\u0430\u043E\u044B\u044F]\\w* (?:\u043A\u043E\u043C\u043D\u0430\u0442|\u043C\u0435\u0441\u0442\u0430|\u043A\u0440\u043E\u0432\u0430\u0442)",
          "i",
          3
        ],
        [
          "^\\s*(?:\u0645\u062A\u0627\u062D|\u0645\u062A\u0648\u0641\u0631|\u064A\u062A\u0648\u0641\u0631|\u0644\u0644\u0627\u064A\u062C\u0627\u0631|\u0644\u0644\u0628\u064A\u0639)",
          "i",
          6
        ],
        [
          "\\b\u0645\u062A\u0627\u062D(?:\u0647)? (?:\u0644\u0644\u0627\u064A\u062C\u0627\u0631|\u063A\u0631\u0641\u0647|\u0633\u0631\u064A\u0631|\u0633\u0643\u0646|\u0627\u0633\u062A\u0648\u062F\u064A\u0648)",
          "i",
          4
        ],
        [
          "^\\s*(?:available|for rent|for sale|to let)\\b",
          "i",
          6
        ],
        [
          "\u0641\u0631\u064A\u0642 \u0627\u0644\u062A\u0646\u0638\u064A\u0641|\u0634\u0631\u0643\u0647 \u062A\u0646\u0638\u064A\u0641|\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0646\u0638\u064A\u0641|\u0646\u062D\u0646 \u0646\u0639\u0645\u0644 \u0645\u0639|\u0646\u0642\u062F\u0645 \u062E\u062F\u0645\u0627\u062A",
          "i",
          6
        ],
        [
          "\\b(?:cleaning|moving|movers|pest control) (?:company|services?)\\b",
          "i",
          6
        ],
        [
          "\\bwe offer\\b|\\bour services\\b",
          "i",
          3
        ],
        [
          "\\b\u043C\u044B \u043F\u043E\u043C\u043E\u0436\u0435\u043C\\b",
          "i",
          3
        ],
        [
          "\\b\u0443 \u043D\u0430\u0441 (?:\u0432\u0441\u0435 |\u0432\u0441\u0435 )?\u0435\u0441\u0442\u044C\\b",
          "i",
          3
        ],
        [
          "\\b\u0441\u043A\u0438\u0434\u043A\\w*",
          "i",
          3
        ],
        [
          "\\b\u0431\u043E\u043D\u0443\u0441\\w*",
          "i",
          2
        ],
        [
          "\\b\u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442\u0435\\b",
          "i",
          2
        ],
        [
          "\\b\u0432\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435\\b",
          "i",
          3
        ],
        [
          "\u064A\u062A\u0648\u0641\u0631 \u0644\u062F\u064A\u0646\u0627|\u0645\u062A\u0648\u0641\u0631 \u0644\u062F\u064A\u0646\u0627|\u0648\u064A\u062A\u0648\u0641\u0631|\u0648\u0645\u062A\u0648\u0641\u0631|\u0648\u0645\u0648\u062C\u0648\u062F|\u0644\u062F\u064A\u0646\u0627 (?:\u0634\u0642\u0642|\u0641\u0644\u0644|\u0645\u062D\u0644\u0627\u062A|\u0645\u0633\u0627\u062D\u0627\u062A|\u0645\u0633\u062A\u0648\u062F\u0639|\u0645\u0633\u062A\u0648\u062F\u0639\u0627\u062A|\u0627\u0631\u0636|\u0633\u0643\u0646)",
          "i",
          5
        ],
        [
          "^\\s*\u0644\u062F\u064A\u0646\u0627\\b",
          "i",
          6
        ],
        [
          "\u0641\u0631\u0635\u0647 \u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A\u0647",
          "i",
          5
        ],
        [
          "\u062F\u062E\u0644 \u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A \u0645\u0636\u0645\u0648\u0646",
          "i",
          5
        ],
        [
          "\u0641\u0631\u0635\u0647 \u0645\u0645\u064A\u0632\u0647",
          "i",
          4
        ],
        [
          "\u0641\u064A \u062C\u0645\u064A\u0639 (?:\u0627\u0644\u0645\u0646\u0627\u0637\u0642|\u0645\u0646\u0627\u0637\u0642)",
          "i",
          3
        ],
        [
          "\\bwe have\\b",
          "i",
          4
        ],
        [
          "\\bcandidates?\\b",
          "i",
          4
        ],
        [
          "\\bjob in\\b",
          "i",
          5
        ],
        [
          "\u0627\u0644\u0637\u0644\u0628 \u0639\u0627\u0644\u064A",
          "i",
          4
        ]
      ],
      property: [
        [
          "\\bapartment\\b",
          "i"
        ],
        [
          "\\bflat\\b",
          "i"
        ],
        [
          "\\bvilla\\b",
          "i"
        ],
        [
          "\\bstudio\\b",
          "i"
        ],
        [
          "\\btownhouse\\b",
          "i"
        ],
        [
          "\\bpenthouse\\b",
          "i"
        ],
        [
          "\\broom\\b",
          "i"
        ],
        [
          "\\bbedroom\\b",
          "i"
        ],
        [
          "\\b\\d\\s?bh?k\\b",
          "i"
        ],
        [
          "\\b\\d\\s?br\\b",
          "i"
        ],
        [
          "\\bhouse\\b",
          "i"
        ],
        [
          "\\bplace to (?:live|stay|rent)\\b",
          "i"
        ],
        [
          "\\baccommodation\\b",
          "i"
        ],
        [
          "\\bbuilding\\b",
          "i"
        ],
        [
          "\\bcompound\\b",
          "i"
        ],
        [
          "\\bproperty\\b",
          "i"
        ],
        [
          "\\bunit\\b",
          "i"
        ],
        [
          "\\blease\\b",
          "i"
        ],
        [
          "\u0634\u0642\u0647",
          "i"
        ],
        [
          "\u0634\u0642\u0647",
          "i"
        ],
        [
          "\u0641\u064A\u0644\u0627",
          "i"
        ],
        [
          "\u0627\u0633\u062A\u0648\u062F\u064A\u0648",
          "i"
        ],
        [
          "\u0633\u062A\u0648\u062F\u064A\u0648",
          "i"
        ],
        [
          "\u0633\u0643\u0646",
          "i"
        ],
        [
          "\u063A\u0631\u0641\u0647",
          "i"
        ],
        [
          "\u0639\u0642\u0627\u0631",
          "i"
        ],
        [
          "\u0628\u064A\u062A",
          "i"
        ],
        [
          "\u0645\u0646\u0632\u0644",
          "i"
        ],
        [
          "\u0634\u0642\u0642",
          "i"
        ],
        [
          "\u0641\u0644\u0644",
          "i"
        ],
        [
          "\u063A\u0631\u0641\u062A\u064A\u0646",
          "i"
        ],
        [
          "\u063A\u0631\u0641\u0647 \u0648\u0635\u0627\u0644\u0647",
          "i"
        ],
        [
          "\u063A\u0631\u0641\u0647 \u0648\u0635\u0627\u0644\u0647",
          "i"
        ],
        [
          "\u0645\u0644\u062D\u0642",
          "i"
        ],
        [
          "\u0628\u0627\u0631\u062A\u0634\u0646",
          "i"
        ],
        [
          "\u0628\u0627\u0631\u062A\u064A\u0634\u0646",
          "i"
        ],
        [
          "\u0628\u0627\u0631\u062A\u0634\u064A\u0646",
          "i"
        ],
        [
          "\u0628\u064A\u062A \u0634\u0639\u0628\u064A",
          "i"
        ],
        [
          "\u0645\u062C\u0644\u0633",
          "i"
        ],
        [
          "\u0635\u0627\u0644\u0647",
          "i"
        ],
        [
          "\u0635\u0627\u0644\u0647",
          "i"
        ],
        [
          "\u0633\u0643\u0646 \u0639\u0627\u0626\u0644\u064A",
          "i"
        ],
        [
          "\u0633\u0643\u0646 \u0639\u0645\u0627\u0644",
          "i"
        ],
        [
          "\u0633\u0643\u0646 \u0633\u062A\u0627\u0641",
          "i"
        ],
        [
          "\u0645\u0632\u0631\u0639\u0647",
          "i"
        ],
        [
          "\u0628\u0646\u0627\u064A\u0647",
          "i"
        ],
        [
          "\u0628\u0646\u0627\u064A\u0647",
          "i"
        ],
        [
          "\u0639\u0645\u0627\u0631\u0647",
          "i"
        ],
        [
          "\u0639\u0645\u0627\u0631\u0647",
          "i"
        ],
        [
          "\u043A\u0432\u0430\u0440\u0442\u0438\u0440",
          "i"
        ],
        [
          "\u0430\u043F\u0430\u0440\u0442\u0430\u043C\u0435\u043D\u0442",
          "i"
        ],
        [
          "\u0432\u0438\u043B\u043B",
          "i"
        ],
        [
          "\u0441\u0442\u0443\u0434\u0438",
          "i"
        ],
        [
          "\u0436\u0438\u043B\u044C",
          "i"
        ],
        [
          "\u0434\u043E\u043C\\b",
          "i"
        ],
        [
          "\u043A\u043E\u043C\u043D\u0430\u0442",
          "i"
        ],
        [
          "\u092B\u094D\u0932\u0948\u091F",
          "i"
        ],
        [
          "\u092E\u0915\u093E\u0928",
          "i"
        ],
        [
          "\u0915\u092E\u0930\u093E",
          "i"
        ],
        [
          "\u0918\u0930",
          "i"
        ],
        [
          "\u0641\u0644\u064A\u0679",
          "i"
        ],
        [
          "\u0645\u0643\u0627\u0646",
          "i"
        ],
        [
          "\u0643\u0645\u0631\u06C1",
          "i"
        ],
        [
          "\u06AF\u06BE\u0631",
          "i"
        ],
        [
          "\\bbahay\\b",
          "i"
        ],
        [
          "\\bkwarto\\b",
          "i"
        ],
        [
          "\\bkondo\\b",
          "i"
        ],
        [
          "\\bappartement\\b",
          "i"
        ],
        [
          "\\bmaison\\b",
          "i"
        ],
        [
          "\\blogement\\b",
          "i"
        ],
        [
          "\\bbed ?space\\b",
          "i"
        ],
        [
          "\\bpartition\\b",
          "i"
        ],
        [
          "\\bbed in (?:a )?room\\b",
          "i"
        ],
        [
          "\\bsharing\\b",
          "i"
        ],
        [
          "\u0633\u0631\u064A\u0631",
          "i"
        ],
        [
          "\u0633\u0643\u0646 \u0645\u0634\u062A\u0631\u0643",
          "i"
        ],
        [
          "\u0628\u0627\u0631\u062A\u064A\u0634\u0646",
          "i"
        ],
        [
          "\\b\\d\\s?beds?\\b",
          "i"
        ],
        [
          "\\bmaster ?room\\b",
          "i"
        ],
        [
          "\\bbed ?room\\b",
          "i"
        ],
        [
          "\u0431\u0435\u0434\u0440\u0443\u043C",
          "i"
        ],
        [
          "\u0431\u044D\u0434\u0440\u0443\u043C",
          "i"
        ],
        [
          "\u043C\u0430\u0441\u0442\u0435\u0440 ?\u0440\u0443\u043C",
          "i"
        ],
        [
          "\u0431\u0435\u0434\u0441\u043F\u0435\u0439\u0441",
          "i"
        ],
        [
          "\u0431\u044D\u0434\u0441\u043F\u0435\u0439\u0441",
          "i"
        ],
        [
          "\u0430\u043F\u0430\u0440\u0442\\b",
          "i"
        ],
        [
          "\u0442\u0430\u0443\u043D\u0445\u0430\u0443\u0441",
          "i"
        ],
        [
          "\u043F\u0435\u043D\u0442\u0445\u0430\u0443\u0441",
          "i"
        ],
        [
          "\u043F\u043E\u0434\u0441\u0435\u043B\u0435\u043D\u0438",
          "i"
        ],
        [
          "\u043F\u043E\u0434\u0441\u0435\u043B\u0435\u043D\u0438\u0435",
          "i"
        ],
        [
          "\u0441\u043E\u0436\u0438\u0442\u0435\u043B",
          "i"
        ],
        [
          "\\bghar\\b",
          "i"
        ],
        [
          "\\bmakan\\b",
          "i"
        ],
        [
          "\\bmakaan\\b",
          "i"
        ],
        [
          "\\bkamra\\b",
          "i"
        ],
        [
          "\\bkamara\\b",
          "i"
        ],
        [
          "\\brum\\b",
          "i"
        ],
        [
          "\\bbedroom wala\\b",
          "i"
        ],
        [
          "\\bflat\\b",
          "i"
        ],
        [
          "\u0627\u067E\u0627\u0631\u062A\u0645\u0627\u0646",
          "i"
        ],
        [
          "\u0627\u067E\u0627\u0631\u062A\u0645\u0627\u0646",
          "i"
        ],
        [
          "\u062E\u0627\u0646\u0647",
          "i"
        ],
        [
          "\u0633\u0648\u0626\u064A\u062A",
          "i"
        ],
        [
          "\u0627\u062A\u0627\u0642",
          "i"
        ],
        [
          "\\b\\d\\s?(?:bd|bdr|bdrm|bed ?rm|b/r)s?\\b",
          "i"
        ],
        [
          "\\b\\d\\s?bedrooms?\\b",
          "i"
        ],
        [
          "\\bbedrooms?\\b",
          "i"
        ],
        [
          "\\d\\s?\u0431\u0440\\b",
          "i"
        ],
        [
          "\\d\\s?\u0431\u0434\\b",
          "i"
        ],
        [
          "\\d\\s?bdr",
          "i"
        ],
        [
          "\u0430\u043F\u0430\u0440\u0442\u043C\u0435\u043D\u0442",
          "i"
        ],
        [
          "\u0430\u043F\u0430\u0440\u0442\u0430\u043C\u0435\u043D\u0442",
          "i"
        ],
        [
          "\u043A\u043E\u0439\u043A[\u043E\u0430\u0443]",
          "i"
        ],
        [
          "\u043C\u0435\u0441\u0442\u043E \u0434\u043B\u044F \u043F\u0440\u043E\u0436\u0438\u0432\u0430\u043D\u0438\u044F",
          "i"
        ],
        [
          "\u043F\u0440\u043E\u0436\u0438\u0432\u0430\u043D\u0438",
          "i"
        ],
        [
          "\\bbad ?space\\b",
          "i"
        ],
        [
          "\\bhotel apartment\\b",
          "i"
        ],
        [
          "\\bannex\\b",
          "i"
        ],
        [
          "\\boffice\\b",
          "i"
        ],
        [
          "\\bshop\\b",
          "i"
        ],
        [
          "\\bwarehouse\\b",
          "i"
        ],
        [
          "\u0645\u0643\u062A\u0628",
          "i"
        ],
        [
          "\u0645\u062D\u0644",
          "i"
        ],
        [
          "\u0645\u0633\u062A\u0648\u062F\u0639",
          "i"
        ],
        [
          "\u0627\u0631\u0636",
          "i"
        ],
        [
          "\u0627\u0631\u0627\u0636\u064A",
          "i"
        ],
        [
          "\u0645\u0632\u0627\u0631\u0639",
          "i"
        ],
        [
          "\u0628\u0646\u0627\u064A\u0627\u062A",
          "i"
        ],
        [
          "\u0628\u064A\u0648\u062A",
          "i"
        ],
        [
          "\u0634\u0628\u0631\u0647",
          "i"
        ],
        [
          "\u0634\u0628\u0631\u0627\u062A",
          "i"
        ],
        [
          "\u062F\u0643\u0627\u0646",
          "i"
        ],
        [
          "\u062D\u0648\u0637\u0647",
          "i"
        ],
        [
          "\u0635\u0646\u0627\u0639\u064A\u0647",
          "i"
        ],
        [
          "\u0639\u0632\u0628",
          "i"
        ],
        [
          "\u0639\u0632\u0628\u0647",
          "i"
        ],
        [
          "\u0645\u062C\u0645\u0639",
          "i"
        ],
        [
          "\u0645\u062C\u0645\u0639\u0627\u062A",
          "i"
        ],
        [
          "\u0645\u0628\u0646\u064A",
          "i"
        ],
        [
          "\u0645\u0628\u0646\u064A",
          "i"
        ],
        [
          "\u0627\u0633\u062A\u0631\u0627\u062D\u0647",
          "i"
        ],
        [
          "\u0635\u0646\u0627\u0639\u064A\u0627\u062A",
          "i"
        ],
        [
          "\u0645\u063A\u0633\u0644\u0647",
          "i"
        ],
        [
          "\u0645\u0639\u0647\u062F",
          "i"
        ],
        [
          "\u0639\u0631\u0641\u0647 \u0645\u0627\u0633\u062A\u0631",
          "i"
        ],
        [
          "\u0645\u0627\u0633\u062A\u0631",
          "i"
        ],
        [
          "\\bfarms?\\b",
          "i"
        ],
        [
          "\\blands?\\b",
          "i"
        ],
        [
          "\\bplots?\\b",
          "i"
        ]
      ],
      geo: [
        [
          "\\bdubai\\b",
          "i"
        ],
        [
          "\\babu dhabi\\b",
          "i"
        ],
        [
          "\\bsharjah\\b",
          "i"
        ],
        [
          "\\bajman\\b",
          "i"
        ],
        [
          "\\bfujairah\\b",
          "i"
        ],
        [
          "\\bras al khaimah\\b",
          "i"
        ],
        [
          "\\brak\\b",
          "i"
        ],
        [
          "\\bumm al quwain\\b",
          "i"
        ],
        [
          "\\buae\\b",
          "i"
        ],
        [
          "\\bemirates\\b",
          "i"
        ],
        [
          "\\bdxb\\b",
          "i"
        ],
        [
          "\\bAUH\\b",
          "i"
        ],
        [
          "\\bmarina\\b",
          "i"
        ],
        [
          "\\bjlt\\b",
          "i"
        ],
        [
          "\\bjvc\\b",
          "i"
        ],
        [
          "\\bjbr\\b",
          "i"
        ],
        [
          "\\bdowntown\\b",
          "i"
        ],
        [
          "\\bbusiness bay\\b",
          "i"
        ],
        [
          "\\bdeira\\b",
          "i"
        ],
        [
          "\\bbur dubai\\b",
          "i"
        ],
        [
          "\\bkarama\\b",
          "i"
        ],
        [
          "\\bsatwa\\b",
          "i"
        ],
        [
          "\\bbarsha\\b",
          "i"
        ],
        [
          "\\btecom\\b",
          "i"
        ],
        [
          "\\bsilicon oasis\\b",
          "i"
        ],
        [
          "\\bdiscovery gardens\\b",
          "i"
        ],
        [
          "\\binternational city\\b",
          "i"
        ],
        [
          "\\bmirdif\\b",
          "i"
        ],
        [
          "\\bal nahda\\b",
          "i"
        ],
        [
          "\\bal qusais\\b",
          "i"
        ],
        [
          "\\bmotor city\\b",
          "i"
        ],
        [
          "\\bsports city\\b",
          "i"
        ],
        [
          "\\bdamac hills\\b",
          "i"
        ],
        [
          "\\barabian ranches\\b",
          "i"
        ],
        [
          "\\bthe springs\\b",
          "i"
        ],
        [
          "\\bthe meadows\\b",
          "i"
        ],
        [
          "\\bpalm jumeirah\\b",
          "i"
        ],
        [
          "\\bcreek harbour\\b",
          "i"
        ],
        [
          "\\bdubai hills\\b",
          "i"
        ],
        [
          "\\bal reem\\b",
          "i"
        ],
        [
          "\\byas island\\b",
          "i"
        ],
        [
          "\\bsaadiyat\\b",
          "i"
        ],
        [
          "\\bkhalifa city\\b",
          "i"
        ],
        [
          "\\bal reef\\b",
          "i"
        ],
        [
          "\\bmbz\\b",
          "i"
        ],
        [
          "\u062F\u0628\u064A",
          "i"
        ],
        [
          "\u0627\u0628\u0648\u0638\u0628\u064A",
          "i"
        ],
        [
          "\u0627\u0628\u0648\u0638\u0628\u064A",
          "i"
        ],
        [
          "\u0627\u0644\u0634\u0627\u0631\u0642\u0647",
          "i"
        ],
        [
          "\u0639\u062C\u0645\u0627\u0646",
          "i"
        ],
        [
          "\u0627\u0644\u0627\u0645\u0627\u0631\u0627\u062A",
          "i"
        ],
        [
          "\u0627\u0644\u0627\u0645\u0627\u0631\u0627\u062A",
          "i"
        ],
        [
          "\u0627\u0644\u0639\u064A\u0646",
          "i"
        ],
        [
          "\u062F\u0443\u0431\u0430\u0439",
          "i"
        ],
        [
          "\u0414\u0443\u0431\u0430\u0439",
          "i"
        ],
        [
          "\u0410\u0431\u0443[- ]\u0414\u0430\u0431\u0438",
          "i"
        ],
        [
          "\u0428\u0430\u0440\u0434\u0436",
          "i"
        ],
        [
          "\u041E\u0410\u042D",
          "i"
        ],
        [
          "\u042D\u043C\u0438\u0440\u0430\u0442",
          "i"
        ],
        [
          "\u0926\u0941\u092C\u0908",
          "i"
        ],
        [
          "\u0936\u093E\u0930\u091C\u093E\u0939",
          "i"
        ],
        [
          "\u062F\u0628\u0626\u064A",
          "i"
        ]
      ],
      nonUae: [
        [
          "\\bmoscow\\b",
          "i"
        ],
        [
          "\u043C\u043E\u0441\u043A\u0432",
          "i"
        ],
        [
          "\u043C\u0438\u0447\u0443\u0440\u0438\u043D\u0441\u043A",
          "i"
        ],
        [
          "\\b\u0441\u043F\u0431\\b",
          "i"
        ],
        [
          "\u043F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433",
          "i"
        ],
        [
          "\u043F\u0438\u0442\u0435\u0440\\b",
          "i"
        ],
        [
          "\\bkyiv\\b",
          "i"
        ],
        [
          "\\bkiev\\b",
          "i"
        ],
        [
          "\u043A\u0438\u0435\u0432",
          "i"
        ],
        [
          "\\bminsk\\b",
          "i"
        ],
        [
          "\u043C\u0438\u043D\u0441\u043A",
          "i"
        ],
        [
          "\\balmaty\\b",
          "i"
        ],
        [
          "\u0430\u043B\u043C\u0430\u0442\u044B",
          "i"
        ],
        [
          "\\btbilisi\\b",
          "i"
        ],
        [
          "\u0442\u0431\u0438\u043B\u0438\u0441\u0438",
          "i"
        ],
        [
          "\\byerevan\\b",
          "i"
        ],
        [
          "\u0435\u0440\u0435\u0432\u0430\u043D",
          "i"
        ],
        [
          "\\bistanbul\\b",
          "i"
        ],
        [
          "\u0441\u0442\u0430\u043C\u0431\u0443\u043B",
          "i"
        ],
        [
          "\\bantalya\\b",
          "i"
        ],
        [
          "\u0430\u043D\u0442\u0430\u043B\u044C",
          "i"
        ],
        [
          "\\bbaku\\b",
          "i"
        ],
        [
          "\u0431\u0430\u043A\u0443",
          "i"
        ],
        [
          "\\btashkent\\b",
          "i"
        ],
        [
          "\u0442\u0430\u0448\u043A\u0435\u043D\u0442",
          "i"
        ],
        [
          "\\bbishkek\\b",
          "i"
        ],
        [
          "\\blondon\\b",
          "i"
        ],
        [
          "\\bparis\\b",
          "i"
        ],
        [
          "\\bberlin\\b",
          "i"
        ],
        [
          "\\bbangkok\\b",
          "i"
        ],
        [
          "\\bbali\\b",
          "i"
        ],
        [
          "\\bdoha\\b",
          "i"
        ],
        [
          "\\briyadh\\b",
          "i"
        ],
        [
          "\\bjeddah\\b",
          "i"
        ],
        [
          "\u062C\u062F\u0647",
          "i"
        ],
        [
          "\\bkuwait\\b",
          "i"
        ],
        [
          "\u0627\u0644\u0643\u0648\u064A\u062A",
          "i"
        ],
        [
          "\\bmuscat\\b",
          "i"
        ],
        [
          "\u0645\u0633\u0642\u0637",
          "i"
        ],
        [
          "\\bcairo\\b",
          "i"
        ],
        [
          "\u0627\u0644\u0642\u0627\u0647\u0631\u0647",
          "i"
        ],
        [
          "\\bdamascus\\b",
          "i"
        ],
        [
          "\u062F\u0645\u0634\u0642",
          "i"
        ],
        [
          "\\bsanaa\\b",
          "i"
        ],
        [
          "\u0635\u0646\u0639\u0627\u0621",
          "i"
        ],
        [
          "\\bamman\\b",
          "i"
        ],
        [
          "\u0639\u0645\u0627\u0646 \u0627\u0644\u0627\u0631\u062F\u0646",
          "i"
        ],
        [
          "\\bkarachi\\b",
          "i"
        ],
        [
          "\\blahore\\b",
          "i"
        ],
        [
          "\\bmumbai\\b",
          "i"
        ],
        [
          "\\bdelhi\\b",
          "i"
        ],
        [
          "\\bmanila\\b",
          "i"
        ]
      ],
      roleInversion: [
        [
          "\\blooking for (?:a |an |new )?(?:tenants?|buyers?|investors?|clients?|partners?|occupants?|sharers?)\\b",
          "i"
        ],
        [
          "\\bseeking (?:a |an )?(?:tenants?|buyers?|investors?|clients?)\\b",
          "i"
        ],
        [
          "\\b(?:tenants?|buyers?|investors?) (?:wanted|needed|required)\\b",
          "i"
        ],
        [
          "\\b(?:are|is) (?:you|anyone|any one) looking for\\b",
          "i"
        ],
        [
          "\\banyone looking (?:for|to (?:rent|buy|move))\\b",
          "i"
        ],
        [
          "\\bany(?:one|body) (?:interested|in need of)\\b",
          "i"
        ],
        [
          "\\bwho(?:'s| is) looking for\\b",
          "i"
        ],
        [
          "\\bif you(?:'re| are) looking for\\b",
          "i"
        ],
        [
          "\\blooking to (?:rent out|lease out|sell)\\b",
          "i"
        ],
        [
          "\\bi have (?:a |an )?(?:\\d\\s?(?:bhk|br|bed)|apartment|villa|studio|unit|flat)\\b.{0,40}\\bavailable\\b",
          "i"
        ],
        [
          "\\b\u062F\u0627\u0626\u0646|\u0645\u0637\u0644\u0648\u0628 \u0645\u0633\u062A\u0627\u062C\u0631",
          "i"
        ],
        [
          "\u0645\u0637\u0644\u0648\u0628 \u0645\u0633\u062A\u0627\u062C\u0631",
          "i"
        ],
        [
          "\u0645\u0637\u0644\u0648\u0628 \u0645\u0634\u062A\u0631\u064A",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 (?:\u0430\u0440\u0435\u043D\u0434\u0430\u0442\u043E\u0440\u0430|\u043F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u044F|\u043A\u0432\u0430\u0440\u0442\u0438\u0440\u0430\u043D\u0442\u0430)\\b",
          "i"
        ],
        [
          "\\b\u0441\u0434\u0430\u043C\\b",
          "i"
        ],
        [
          "\\b\u043F\u0440\u043E\u0434\u0430\u043C\\b",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 \u0441\u043E\u0441\u0435\u0434(?:\u043A\u0443|\u0430|\u0435\u0439|\u043A\u0443 \u043F\u043E)\\b",
          "i"
        ],
        [
          "\\b\u043D\u0443\u0436\u043D\u0430 \u0441\u043E\u0441\u0435\u0434\u043A\u0430\\b",
          "i"
        ],
        [
          "\\b\u043D\u0443\u0436\u0435\u043D \u0441\u043E\u0441\u0435\u0434\\b",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 \u0434\u0435\u0432\u0443\u0448\u043A\u0443 \u0434\u043B\u044F \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0436\u0438\u0432\u0430\u043D\u0438\u044F\\b",
          "i"
        ],
        [
          "\u0644\u0639\u0645\u0644\u0627\u0626\u0646\u0627",
          "i"
        ],
        [
          "\u0644\u0639\u0645\u0644\u0627\u0621\u0646\u0627",
          "i"
        ],
        [
          "\u0644\u062F\u064A\u0646\u0627 \u0639\u0645\u0644\u0627\u0621",
          "i"
        ],
        [
          "\u0644\u062F\u064A\u0646\u0627 \u0632\u0628\u0627\u0626\u0646",
          "i"
        ],
        [
          "\u0644\u062F\u064A\u0646\u0627 \u0645\u0634\u062A\u0631\u064A\u0646",
          "i"
        ],
        [
          "\\bfor our clients?\\b",
          "i"
        ],
        [
          "\\bwe have (?:buyers|clients|tenants|investors|customers)\\b",
          "i"
        ],
        [
          "\\bon behalf of (?:our |a )?clients?\\b",
          "i"
        ],
        [
          "\\b(?:client|buyer|investor|tenant)s?\\s+(?:is |are )?looking for\\b",
          "i"
        ],
        [
          "\\bfor (?:a |my |our )?(?:serious |potential |cash )?(?:buyer|client|investor)s?\\b",
          "i"
        ],
        [
          "\\bmy client\\b",
          "i"
        ],
        [
          "\\bbelow (?:op|original price)\\b",
          "i"
        ],
        [
          "\\bop (?:or|and) below\\b",
          "i"
        ],
        [
          "\\bdi?s+tress(?:ed)?\\b",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0435\u043C \u0441\u043E\u0441\u0435\u0434(?:\u043A\u0443|\u0430|\u0435\u0439)\\b",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 (?:\u043F\u0430\u0440\u043D\u0435\u0439|\u0434\u0435\u0432\u0443\u0448\u0435\u043A|\u0440\u0435\u0431\u044F\u0442|\u0441\u043E\u0441\u0435\u0434\u0435\u0439|\u0436\u0438\u043B\u044C\u0446\u043E\u0432)\\b",
          "i"
        ],
        [
          "\\b\u043A\u043E\u043C\u0443 \u043D\u0443\u0436\u043D\\w*\\b",
          "i"
        ],
        [
          "\\b\u0435\u0441\u043B\u0438 \u0432\u044B \u0445\u043E\u0442\u0438\u0442\u0435 (?:\u0441\u0434\u0430\u0442\u044C|\u0441\u043D\u044F\u0442\u044C)\\b",
          "i"
        ],
        [
          "\\b\u0441\u0434\u0430\u0442\u044C \u0438\u043B\u0438 \u0441\u043D\u044F\u0442\u044C\\b",
          "i"
        ],
        [
          "\u0644\u0648 \u062D\u0636\u0631\u062A\u0643 \u0645\u0627\u0644\u0643",
          "i"
        ],
        [
          "\u0627\u0630\u0627 \u0643\u0646\u062A \u0645\u0627\u0644\u0643",
          "i"
        ],
        [
          "\u0644\u0648 \u0627\u0646\u062A \u0645\u0627\u0644\u0643",
          "i"
        ],
        [
          "\u0627\u0639\u0631\u0636(?: \u0639\u0644\u064A\u0646\u0627)? \u0627\u0644\u0645\u0648\u062C\u0648\u062F",
          "i"
        ],
        [
          "\u0645\u062C\u0627\u0644 \u0639\u0645\u0644\u064A",
          "i"
        ],
        [
          "\u0646\u0639\u0645\u0644 \u0637\u064A\u0644\u0647",
          "i"
        ],
        [
          "\u0639\u0644\u064A \u0645\u062F\u0627\u0631 \u0627\u0644\u0633\u0627\u0639\u0647",
          "i"
        ],
        [
          "\u0645\u0643\u062A\u0628(?:\u0646\u0627)? \u0639\u0642\u0627\u0631",
          "i"
        ],
        [
          "\u0648\u0633\u064A\u0637 \u0639\u0642\u0627\u0631\u064A",
          "i"
        ],
        [
          "\u064A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A",
          "i"
        ],
        [
          "\u0644\u062F\u064A\u0646\u0627 \u0637\u0644\u0628\u0627\u062A",
          "i"
        ],
        [
          "\u0628\u0634\u0643\u0644 \u0645\u0633\u062A\u0645\u0631",
          "i"
        ],
        [
          "\u0628\u0627\u0633\u062A\u0645\u0631\u0627\u0631",
          "i"
        ],
        [
          "\u0647\u0644 \u062A\u0645\u0644\u0643",
          "i"
        ],
        [
          "\u0646\u062D\u0646 \u0646\u0634\u062A\u0631\u064A",
          "i"
        ],
        [
          "\u0648\u062A\u0631\u064A\u062F \u0628\u064A\u0639\u0647",
          "i"
        ],
        [
          "\u0646\u062D\u0646 \u0634\u0631\u0643\u0647",
          "i"
        ],
        [
          "\u0644\u0644\u0645\u0644\u0627\u0643 \u0627\u0644\u0643\u0631\u0627\u0645",
          "i"
        ],
        [
          "\u0627\u0644\u0645\u0644\u0627\u0643 \u0627\u0644\u0643\u0631\u0627\u0645",
          "i"
        ],
        [
          "\u0644\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
          "i"
        ],
        [
          "\u0644\u0644\u0648\u0633\u0627\u0637\u0647",
          "i"
        ],
        [
          "\u0648\u0633\u0627\u0637\u0647 \u0639\u0642\u0627\u0631\u064A\u0647",
          "i"
        ],
        [
          "\u0644\u0627\u062F\u0627\u0631\u0627\u062A\u0647",
          "i"
        ],
        [
          "\u0644\u0627\u062F\u0627\u0631\u062A\u0647",
          "i"
        ],
        [
          "\u0644\u0627\u062F\u0627\u0631\u0647 \u0627\u0644\u0639\u0642\u0627\u0631",
          "i"
        ],
        [
          "\u0645\u0637\u0644\u0648\u0628 \u0634\u0631\u064A\u0643",
          "i"
        ],
        [
          "\\b\u0432 \u043F\u043E\u0438\u0441\u043A\u0435 \u0441\u043E\u0441\u0435\u0434",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 \u0441\u043E\u0441\u0435\u0434\u043A",
          "i"
        ],
        [
          "\u0645\u0637\u0644\u0648\u0628 (?:\u0634\u0628|\u0634\u0627\u0628|\u0628\u0646\u062A|\u0634\u062E\u0635)\\s?\\S*\\s?\\S*\\s?\u0644\u0644\u0645\u0634\u0627\u0631\u0643\u0647",
          "i"
        ],
        [
          "\u0645\u0637\u0644\u0648\u0628 (?:\u0628\u0646\u062A|\u0628\u0646\u0627\u062A|\u0634\u0627\u0628|\u0634\u0628\u0627\u0628|\u0634\u062E\u0635|\u0645\u0648\u0638\u0641|\u0645\u0648\u0638\u0641\u0647)\\s?(?:\\S+\\s){0,3}?(?:\u0644\u0644\u0645\u0634\u0627\u0631\u0643\u0647|\u0644\u0644\u0633\u0643\u0646 \u0645\u0639\u064A|\u0634\u0631\u064A\u0643)",
          "i"
        ],
        [
          "\\b\u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430\\b",
          "i"
        ],
        [
          "\\b\u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432\\b",
          "i"
        ],
        [
          "\\bfor (?:a |my )?client\\b",
          "i"
        ],
        [
          "\\blooking for (?:a )?(?:flat|room) ?mate\\b",
          "i"
        ],
        [
          "\\bdirect from owners?\\b",
          "i"
        ],
        [
          "\\bactively looking for properties\\b",
          "i"
        ],
        [
          "\\breal estate (?:agent|broker|company)\\b",
          "i"
        ],
        [
          "\\blooking for (?:listings|properties to list)\\b",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0435\u043C (?:\u043E\u0431\u044A\u0435\u043A\u0442\u044B|\u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u0438\u043A\u043E\u0432)\\b",
          "i"
        ],
        [
          "\\b\u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u0438\u043A\u0438 \u043D\u0435\u0434\u0432\u0438\u0436\u0438\u043C\u043E\u0441\u0442\u0438\\b",
          "i"
        ]
      ],
      notHousing: [
        [
          "\\b\u0438\u0449\u0443 \u0440\u0430\u0431\u043E\u0442\u0443\\b",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 \u043F\u043E\u0434\u0440\u0430\u0431\u043E\u0442",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044E\\b",
          "i"
        ],
        [
          "\\b\u0440\u0435\u0437\u044E\u043C\u0435\\b",
          "i"
        ],
        [
          "\\blooking for (?:a )?(?:job|work|employment|vacancy)\\b",
          "i"
        ],
        [
          "\\bjob seeker\\b",
          "i"
        ],
        [
          "\\bmy cv\\b",
          "i"
        ],
        [
          "\\bavailable for hire\\b",
          "i"
        ],
        [
          "\u0627\u0628\u062D\u062B \u0639\u0646 \u0639\u0645\u0644",
          "i"
        ],
        [
          "\u0627\u0628\u062D\u062B \u0639\u0646 \u0639\u0645\u0644",
          "i"
        ],
        [
          "\u0627\u0631\u063A\u0628 \u0641\u064A \u0627\u0644\u0639\u0645\u0644",
          "i"
        ],
        [
          "\u0627\u0631\u063A\u0628 \u0641\u064A \u0627\u0644\u0639\u0645\u0644",
          "i"
        ],
        [
          "\u064A\u0637\u0644\u0628 \u0639\u0645\u0644",
          "i"
        ],
        [
          "\u0639\u0627\u0645\u0644\u0647 \u0645\u0646\u0632\u0644\u064A\u0647",
          "i"
        ],
        [
          "\u0639\u0627\u0645\u0644\u0647 \u0645\u0646\u0632\u0644\u064A\u0647",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0435\u043C \u0440\u0430\u0431\u043E\u0442\u0443\\b",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 \u0440\u0430\u0431\u043E\u0442\u0443\\b",
          "i"
        ],
        [
          "\\b\u0440\u0430\u0431\u043E\u0442\u0443 (?:\u043D\u044F\u043D\u0435\u0439|\u0434\u043E\u043C\u0440\u0430\u0431\u043E\u0442\u043D\u0438\u0446|\u0441\u0438\u0434\u0435\u043B\u043A)",
          "i"
        ],
        [
          "\\bwe(?:'re| are) hiring\\b",
          "i"
        ],
        [
          "\\bhiring\\b",
          "i"
        ],
        [
          "\\bvacanc(?:y|ies)\\b",
          "i"
        ],
        [
          "\\bjoin (?:our|the) team\\b",
          "i"
        ],
        [
          "\\b\u0432\u0430\u043A\u0430\u043D\u0441\u0438",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0435\u043C (?:\u043B\u044E\u0434\u0435\u0439|\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A|\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440|\u043A\u043E\u043D\u0442\u0435\u043D\u0442|smm|\u043C\u043E\u0434\u0435\u043B\u0435\u0439|\u0434\u0435\u0432\u0443\u0448\u0435\u043A)",
          "i"
        ],
        [
          "\\b\u0438\u0449\u0443 (?:\u043B\u044E\u0434\u0435\u0439|\u043C\u043E\u0434\u0435\u043B\u0435\u0439|\u043C\u043E\u0434\u0435\u043B\u044C|\u0434\u0435\u0432\u0443\u0448\u0435\u043A|\u043F\u0430\u0440\u0442\u043D\u0435\u0440\u0448\u0443|\u043C\u0443\u0436\u0447\u0438\u043D\u0443)\\b",
          "i"
        ],
        [
          "\\b\u043D\u0430\u0431\u043E\u0440 \u0434\u0435\u0432\u0443\u0448\u0435\u043A\\b",
          "i"
        ],
        [
          "\u0645\u0637\u0644\u0648\u0628 (?:\u0645\u0648\u0638\u0641|\u0645\u0648\u0638\u0641\u0647|\u0639\u0645\u0627\u0644|\u0633\u0627\u0626\u0642|\u0645\u0646\u062F\u0648\u0628|\u0645\u0633\u0648\u0642)",
          "i"
        ],
        [
          "\u0646\u0648\u0638\u0641",
          "i"
        ],
        [
          "\u0641\u0631\u0635\u0647 \u0639\u0645\u0644",
          "i"
        ],
        [
          "\\bparking (?:space|spot|slot)\\b",
          "i"
        ],
        [
          "\u0645\u0648\u0642\u0641 \u0633\u064A\u0627\u0631\u0647",
          "i"
        ]
      ],
      closed: [
        "\u043A\u0432\u0430\u0440\u0442\u0438\u0440\u0430 \u043D\u0430\u0448\u043B\u0430\u0441\u044C|\u0443\u0436\u0435 \u043D\u0430\u0448\u043B\u0438|\u0443\u0436\u0435 \u043D\u0430\u0448\u043B\u0430|\u0443\u0436\u0435 \u043D\u0430\u0448\u0435\u043B|\u0432\u043E\u043F\u0440\u043E\u0441 \u0437\u0430\u043A\u0440\u044B\u0442|\u043D\u0435\u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E|\u043D\u0435 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E|\\b(?:already )?found (?:it|one|a place)\\b|\\bno longer (?:needed|looking)\\b|\u062A\u0645 \u0627\u0644\u0627\u064A\u062C\u0627\u0631|\u062A\u0645 \u0627\u0644\u0628\u064A\u0639|\u062A\u0645 \u0627\u064A\u062C\u0627\u062F|\u0644\u0645 \u064A\u0639\u062F \u0645\u0637\u0644\u0648\u0628",
        "i"
      ],
      phone: [
        "(?:\\+?971|00971|0)\\s?5[024568]\\s?\\d{3}\\s?\\d{4}",
        ""
      ],
      url: [
        "https?://\\S+",
        ""
      ],
      hashtag: [
        "#\\w+",
        ""
      ],
      contextAmbiguous: [
        "\\bfor rent\\b",
        "\\bfor sale\\b",
        "\\bto let\\b",
        "\\b\xE0 louer\\b",
        "\\b\xE0 vendre\\b",
        "\u0644\u0644\u0627\u064A\u062C\u0627\u0631",
        "\u0644\u0644\u0628\u064A\u0639",
        "\u0644\u0644\u062A\u0648\u0627\u0635\u0644",
        "\u0645\u0646 \u0627\u0644\u0645\u0627\u0644\u0643 \u0645\u0628\u0627\u0634\u0631",
        "\u0645\u0646 \u0627\u0644\u0645\u0627\u0644\u0643 \u0645\u0628\u0627\u0634\u0631\u0647",
        "\u0645\u0648\u0642\u0639 \u0645\u0645\u064A\u0632"
      ],
      x: {
        _URDU_CUES: [
          "\u06C1\u06D2|\u06C1\u06CC\u06BA|\u06A9\u06CC\u0627|\u0686\u0627\u06C1\u06CC\u06D2|\u06A9\u0631\u0627\u06CC\u06C1|\u0645\u06A9\u0627\u0646|\u06A9\u0648\u0626\u06CC|\u0645\u06CC\u06BA",
          ""
        ],
        _FARSI_CUES: [
          "\u0645\u06CC\u200C|\u0645\u06CC\u062E\u0648\u0627|\u062F\u0646\u0628\u0627\u0644|\u0627\u062C\u0627\u0631\u0647|\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646|\u0647\u0633\u062A|\u0628\u0631\u0627\u064A|\u0628\u0631\u0627\u06CC",
          ""
        ],
        _TAGALOG_CUES: [
          "\\b(?:naghahanap|hanap|kailangan|malapit|sana|ako|kami|meron|mayroon|kwarto|bahay|po|salamat|kabayan)\\b",
          "i"
        ],
        _HI_LATN_CUES: [
          "\\b(?:chahiye|chaiye|chahiya|dhoond\\w*|dhundh\\w*|talash|kiraye?|makan|makaan|ghar|bhai|koi|hai|kamra|mujhe|hume)\\b",
          "i"
        ],
        _FRENCH_CUES: [
          "\\b(?:je|nous|cherche|cherchons|besoin|logement|appartement|louer|budget de)\\b",
          "i"
        ],
        _BUY: [
          "\\b(?:buy|purchase|freehold|mortgage|for sale to me)\\b|\\b(?:serious|cash|end) buyer\\b|\\bready to (?:buy|purchase)\\b|\\boff[- ]?plan\\b|\u0634\u0631\u0627\u0621|\u0627\u0634\u062A\u0631\u064A|\u0627\u0634\u062A\u0631\u064A|\u0644\u0644\u0634\u0631\u0627\u0621|\u062A\u0645\u0644\u0643|\u0627\u0644\u062A\u062E\u0644\u064A\u0635 \u0643\u0627\u0634|\u0643\u0627\u0634 \u0641\u0648\u0631\u064A|\u0644\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631.{0,20}\u0644\u0644\u0628\u064A\u0639|\\b\u043A\u0443\u043F\u043B\u044E\\b|\\b\u043A\u0443\u043F\u0438\u0442\u044C\\b|\\b\u043F\u043E\u043A\u0443\u043F\u043A|\\b\u043F\u0440\u0438\u043E\u0431\u0440\u0435\u0441\u0442|\\b\u0432 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442|\\b\u0438\u043F\u043E\u0442\u0435\u043A",
          "i"
        ],
        _SHARE: [
          "\\b(?:bed ?space|partition|sharing|share (?:a )?(?:room|flat|apartment)|flatmate|roommate|room ?mate)\\b|\u0628\u0627\u0631\u062A\u0634\u0646|\u0628\u0627\u0631\u062A\u064A\u0634\u0646|\u0633\u0631\u064A\u0631|\u0633\u0643\u0646 \u0645\u0634\u062A\u0631\u0643|\u0645\u0634\u0627\u0631\u0643\u0647 \u0633\u0643\u0646|\u0645\u0634\u0627\u0631\u0643\u0629 \u0633\u0643\u0646|\\b\u0431\u0435\u0434\u0441\u043F\u0435\u0439\u0441|\\b\u043A\u043E\u0439\u043A\u043E|\\b\u043F\u043E\u0434\u0441\u0435\u043B\u0435\u043D\u0438|\\b\u0441\u043E\u0441\u0435\u0434",
          "i"
        ],
        _WANT_FOR_SALE: [
          "(?:\u0645\u0637\u0644\u0648\u0628|\u0627\u0628\u062D\u062B|\u0646\u0628\u062D\u062B|\u0645\u062D\u062A\u0627\u062C|\u0627\u0628\u063A\u0649|\u0627\u0631\u064A\u062F).{0,80}\u0644\u0644\u0628\u064A\u0639|\\blooking for .{0,60}\\bfor sale\\b",
          "i"
        ],
        _RENT_HINT: [
          "\\b(?:rent|lease|monthly|yearly|per (?:month|year)|cheques?)\\b|\u0627\u064A\u062C\u0627\u0631|\u0644\u0644\u0627\u064A\u062C\u0627\u0631|\u0634\u0647\u0631\u064A|\u0633\u0646\u0648\u064A|\\b\u0441\u043D\u0438\u043C\u0443\\b|\\b\u0430\u0440\u0435\u043D\u0434|\\b\u043F\u043E\u043C\u0435\u0441\u044F\u0447\u043D",
          "i"
        ],
        _BIG_PRICE: [
          "(\\d+(?:[.,]\\d+)?)\\s*(?:\u0645\u0644\u064A\u0648\u0646|million|mln|\\bm\\b|\u043C\u043B\u043D)|(\\d{3})\\s*(?:\u0627\u0644\u0641|\u0623\u0644\u0641|k\\b|\u0442\u044B\u0441)",
          "i"
        ],
        _STUDIO: [
          "\\bstudio\\b|\u0627\u0633\u062A\u0648\u062F\u064A\u0648|\u0633\u062A\u0648\u062F\u064A\u0648|\\b\u0441\u0442\u0443\u0434\u0438",
          "i"
        ],
        _BEDSPACE: [
          "\\bbed ?space\\b|\\bpartition\\b|\u0628\u0627\u0631\u062A\u0634\u0646|\u0628\u0627\u0631\u062A\u064A\u0634\u0646|\u0633\u0631\u064A\u0631|\\b\u043A\u043E\u0439\u043A\u043E|\\b\u0431\u0435\u0434\u0441\u043F\u0435\u0439\u0441",
          "i"
        ],
        _MONTHLY_CUE: [
          "\\b(?:per|a|/)\\s*month\\b|\\bmonthly\\b|\\bpm\\b|/\\s*mo\\b|\u0634\u0647\u0631\u064A|\u0628\u0627\u0644\u0634\u0647\u0631|\u0641\u064A \u0627\u0644\u0634\u0647\u0631|\u0634\u0647\u0631\u064A\u0627|\\b\u0432 \u043C\u0435\u0441\u044F\u0446\\b|\\b\u043C\u0435\u0441\u044F\u0446\\b|/\\s*\u043C\u0435\u0441\\b|\\b\u043C\u0435\u0441\\.",
          "i"
        ],
        _YEARLY_CUE: [
          "\\b(?:per|a|/)\\s*(?:year|yr|annum)\\b|\\byearly\\b|\\bannual\\b|\\bpa\\b|\u0633\u0646\u0648\u064A|\u0628\u0627\u0644\u0633\u0646\u0647|\u0641\u064A \u0627\u0644\u0633\u0646\u0647|\u0633\u0646\u0648\u064A\u0627|\\b\u0432 \u0433\u043E\u0434\\b|\\b\u0433\u043E\u0434\\b|/\\s*\u0433\u043E\u0434",
          "i"
        ],
        _K: [
          "(\\d[\\d.,]*)\\s*(?:k\\b|\u043A\\b|\u0442\u044B\u0441\\w*|\u0623\u0644\u0641|\u0627\u0644\u0641|\u0647\u0632\u0627\u0631)",
          "i"
        ],
        _M: [
          "(\\d[\\d.,]*)\\s*(?:m\\b|\u043C\u043B\u043D\\b|\u043C\u0438\u043B\u043B\u0438\u043E\u043D\\w*|\u0645\u0644\u064A\u0648\u0646)",
          "i"
        ],
        _PLAIN: [
          "(?<![\\d.,])(\\d{1,3}(?:[ ,]\\d{3})+|\\d{4,7})(?!\\d)",
          ""
        ],
        _SHORT: [
          "(?<![\\d.,])(\\d{3})(?!\\d)",
          ""
        ],
        _MONEY_CUE: [
          "\\bbudget\\b|\\bmax\\b|\\bupto\\b|\\bup to\\b|\\baed\\b|\\bdhs?\\b|\\brent\\b|\\bprice\\b|\u0645\u064A\u0632\u0627\u0646\u064A\u0647|\u0628\u062D\u062F\u0648\u062F|\u0627\u064A\u062C\u0627\u0631|\u062F\u0631\u0647\u0645|\\b\u0431\u044E\u0434\u0436\u0435\u0442|\\b\u0434\u043E\\b|\\b\u0430\u0440\u0435\u043D\u0434|\\b\u0446\u0435\u043D\u0430|\\b\u0434\u0438\u0440\u0445\u0430\u043C",
          "i"
        ],
        _NOT_MONEY: [
          "\\b(?:sq\\.?\\s?ft|sqft|sqm|m2|\u043C2|\u043A\u0432\\.?\\s?\u043C|\u043C\u0435\u0442\u0440)\\b|\\b(?:19|20)\\d{2}\\b|\\+?971|\\b05[024568]\\d{7}\\b",
          "i"
        ],
        _CURRENCY_HINT: [
          "\\baed\\b|\\bdhs?\\b|\\bdirham|\u062F\u0631\u0647\u0645|\\b\u0627ed\\b|\\b\u0434\u0438\u0440\u0445\u0430\u043C|\\b\u0430\u0435\u0434\\b|\\b\u0434\u0445\u0441\\b",
          "i"
        ],
        _FOREIGN_CURRENCY: [
          "[$\u20AC\xA3]|\\busd\\b|\\beur\\b|\\brub\\b|\\b\u0440\u0443\u0431\\b|\\b\u0434\u043E\u043B\u043B",
          "i"
        ],
        _PHONE_CANDIDATE: [
          "(?:\\+?9\\s?7\\s?1|00\\s?971)?[\\s\\-().]*0?5[\\s\\-().]*[024568](?:[\\s\\-().]*[\\d\u0660-\u0669]){7}",
          ""
        ]
      },
      areas: [
        [
          "Dubai Marina",
          "\\bmarina\\b|\u043C\u0430\u0440\u0438\u043D",
          "i"
        ],
        [
          "JLT",
          "\\bjlt\\b|jumeirah lake",
          "i"
        ],
        [
          "JVC",
          "\\bjvc\\b|jumeirah village",
          "i"
        ],
        [
          "JBR",
          "\\bjbr\\b",
          "i"
        ],
        [
          "Downtown Dubai",
          "\\bdowntown\\b|\u0434\u0430\u0443\u043D\u0442\u0430\u0443\u043D",
          "i"
        ],
        [
          "Business Bay",
          "business bay|\u0431\u0438\u0437\u043D\u0435\u0441 \u0431\u0435\u0439",
          "i"
        ],
        [
          "Deira",
          "\\bdeira\\b|\u062F\u064A\u0631\u0647|\u0434\u0435\u0439\u0440\u0430",
          "i"
        ],
        [
          "Bur Dubai",
          "bur dubai|\u0628\u0631\u062F\u0628\u064A|\u0431\u0443\u0440 ?\u0434\u0443\u0431\u0430\u0439",
          "i"
        ],
        [
          "Karama",
          "\\bkarama\\b|\u0627\u0644\u0643\u0631\u0627\u0645\u0647|\u043A\u0430\u0440\u0430\u043C\u0430",
          "i"
        ],
        [
          "Satwa",
          "\\bsatwa\\b|\u0627\u0644\u0633\u0637\u0648\u0647",
          "i"
        ],
        [
          "Al Barsha",
          "\\bbarsha\\b|\u0627\u0644\u0628\u0631\u0634\u0627\u0621|\u0431\u0430\u0440\u0448\u0430",
          "i"
        ],
        [
          "TECOM / Barsha Heights",
          "\\btecom\\b",
          "i"
        ],
        [
          "Silicon Oasis",
          "silicon oasis|\\bdso\\b",
          "i"
        ],
        [
          "Discovery Gardens",
          "discovery gardens",
          "i"
        ],
        [
          "International City",
          "international city|\u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0448\u043D\u043B \u0441\u0438\u0442\u0438",
          "i"
        ],
        [
          "Mirdif",
          "\\bmirdif\\b|\u0645\u0631\u062F\u0641",
          "i"
        ],
        [
          "Al Nahda",
          "al nahda|\u0627\u0644\u0646\u0647\u062F\u0647",
          "i"
        ],
        [
          "Al Qusais",
          "qusais|\u0627\u0644\u0642\u0635\u064A\u0635",
          "i"
        ],
        [
          "Motor City",
          "motor city",
          "i"
        ],
        [
          "Sports City",
          "sports city",
          "i"
        ],
        [
          "Damac Hills",
          "damac hills",
          "i"
        ],
        [
          "Arabian Ranches",
          "arabian ranches",
          "i"
        ],
        [
          "Palm Jumeirah",
          "palm jumeirah|\u043F\u0430\u043B\u044C\u043C",
          "i"
        ],
        [
          "Dubai Hills",
          "dubai hills",
          "i"
        ],
        [
          "Dubai Creek Harbour",
          "creek harbour",
          "i"
        ],
        [
          "Jumeirah",
          "\\bjumeirah\\b|\u062C\u0645\u064A\u0631\u0627|\u0434\u0436\u0443\u043C\u0435\u0439\u0440\u0430",
          "i"
        ],
        [
          "Al Reem Island",
          "al reem|\u0627\u0644\u0631\u064A\u0645",
          "i"
        ],
        [
          "Yas Island",
          "yas island",
          "i"
        ],
        [
          "Saadiyat",
          "saadiyat|\u0627\u0644\u0633\u0639\u062F\u064A\u0627\u062A",
          "i"
        ],
        [
          "Khalifa City",
          "khalifa city",
          "i"
        ],
        [
          "Sharjah",
          "\\bsharjah\\b|\u0627\u0644\u0634\u0627\u0631\u0642\u0647|\u0448\u0430\u0440\u0434\u0436",
          "i"
        ],
        [
          "Ajman",
          "\\bajman\\b|\u0639\u062C\u0645\u0627\u0646|\u0430\u0434\u0436\u043C\u0430\u043D",
          "i"
        ],
        [
          "Abu Dhabi",
          "abu dhabi|\u0627\u0628\u0648\u0638\u0628\u064A|\u0430\u0431\u0443[- ]?\u0434\u0430\u0431\u0438",
          "i"
        ],
        [
          "Ras Al Khaimah",
          "ras al khaimah|\\brak\\b|\u0631\u0627\u0633 \u0627\u0644\u062E\u064A\u0645\u0647",
          "i"
        ],
        [
          "Fujairah",
          "\\bfujairah\\b|\u0627\u0644\u0641\u062C\u064A\u0631\u0647",
          "i"
        ],
        [
          "Umm Al Quwain",
          "umm al quwain",
          "i"
        ],
        [
          "Al Ain",
          "\\bal ain\\b|\u0627\u0644\u0639\u064A\u0646",
          "i"
        ],
        [
          "Dubai",
          "\\bdubai\\b|\\bdxb\\b|\u062F\u0628\u064A|\u0434\u0443\u0431\u0430\u0439|\u0434\u0443\u0431\u0430\u0435|\u0434\u0443\u0431\u0430\u044F",
          "i"
        ]
      ],
      urgent: [
        [
          "\\basap\\b|\\burgent(?:ly)?\\b|\\bimmediate(?:ly)?\\b|\\bright away\\b",
          "i",
          "said urgent"
        ],
        [
          "\u0639\u0627\u062C\u0644|\u0641\u0648\u0631\u064A|\u0645\u0633\u062A\u0639\u062C\u0644|\u0628\u0633\u0631\u0639\u0647|\u0628\u0627\u0633\u0631\u0639",
          "i",
          "said urgent (ar)"
        ],
        [
          "\\b\u0441\u0440\u043E\u0447\u043D\u043E\\b|\\b\u0441\u0440\u043E\u0447\u043D\\w*|\\b\u043A\u0430\u043A \u043C\u043E\u0436\u043D\u043E \u0441\u043A\u043E\u0440\u0435\u0435\\b",
          "i",
          "said urgent (ru)"
        ],
        [
          "\\btoday\\b|\\btomorrow\\b|\\bthis week\\b|\\btonight\\b",
          "i",
          "named a date this week"
        ],
        [
          "\\b\u0441\u0435\u0433\u043E\u0434\u043D\u044F\\b|\\b\u0437\u0430\u0432\u0442\u0440\u0430\\b|\\b\u043D\u0430 \u044D\u0442\u043E\u0439 \u043D\u0435\u0434\u0435\u043B\u0435\\b",
          "i",
          "named a date this week (ru)"
        ],
        [
          "\u0627\u0644\u064A\u0648\u0645|\u0628\u0643\u0631\u0647|\u063A\u062F\u0627",
          "i",
          "named a date this week (ar)"
        ],
        [
          "\\bmoving in (?:on|by)?\\s*\\d",
          "i",
          "gave a move-in date"
        ],
        [
          "\\b(?:from|by)\\s+\\d{1,2}\\s*(?:st|nd|rd|th)?\\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)",
          "i",
          "gave a move-in date"
        ],
        [
          "\\b\u0441\\s+\\d{1,2}\\s*(?:\u044F\u043D\u0432|\u0444\u0435\u0432|\u043C\u0430\u0440|\u0430\u043F\u0440|\u043C\u0430\u044F|\u0438\u044E\u043D|\u0438\u044E\u043B|\u0430\u0432\u0433|\u0441\u0435\u043D|\u043E\u043A\u0442|\u043D\u043E\u044F|\u0434\u0435\u043A)",
          "i",
          "gave a move-in date (ru)"
        ]
      ]
    };
  }
});

// src/seekerstream/regex.ts
function groupStartsWithWord(src, at) {
  if (src[at] !== "(") return false;
  let j = at + 1;
  if (src.startsWith("?:", j)) j += 2;
  else if (src[j] === "?") return false;
  let depth = 0;
  let expectStart = true;
  for (; j < src.length; j++) {
    const c = src[j];
    if (expectStart) {
      if (!WORD_CH.test(c)) return false;
      expectStart = false;
    }
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "[") {
      while (j < src.length && src[j] !== "]") {
        if (src[j] === "\\") j++;
        j++;
      }
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      if (depth === 0) return true;
      depth--;
    } else if (c === "|" && depth === 0) expectStart = true;
  }
  return false;
}
function pyToJs(src) {
  let out = "";
  let inClass = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") {
      const n = src[i + 1];
      i++;
      if (n === void 0) {
        out += "\\\\";
        break;
      }
      if (n === "b") {
        if (inClass) {
          out += "\\x08";
          continue;
        }
        const nx = src[i + 1], pv = src[i - 2];
        const nextWord = nx !== void 0 && WORD_CH.test(nx) || nx === "\\" && /[wd]/.test(src[i + 2] ?? "") || groupStartsWithWord(src, i + 1);
        const prevWord = pv !== void 0 && WORD_CH.test(pv) && src[i - 3] !== "\\";
        if (nextWord && !prevWord) {
          out += `(?<![${W}])`;
          continue;
        }
        if (prevWord && !nextWord) {
          out += `(?![${W}])`;
          continue;
        }
        out += B;
        continue;
      }
      if (n === "B") {
        out += NB;
        continue;
      }
      if (n === "w") {
        out += inClass ? W : `[${W}]`;
        continue;
      }
      if (n === "W") {
        out += inClass ? "\\P{L}\\P{N}" : `[^${W}]`;
        continue;
      }
      if (n === "d") {
        out += inClass ? D : `[${D}]`;
        continue;
      }
      if (n === "D") {
        out += inClass ? "\\P{Nd}" : `[^${D}]`;
        continue;
      }
      if (n === "Z") {
        out += "$(?![\\s\\S])";
        continue;
      }
      if (n === "A") {
        out += "^";
        continue;
      }
      if (n === "s") {
        out += inClass ? PY_SPACE : `[${PY_SPACE}]`;
        continue;
      }
      if (n === "S") {
        out += inClass ? "\\S" : `[^${PY_SPACE}]`;
        continue;
      }
      if ("nrtfv0".includes(n) || /[0-9]/.test(n)) {
        out += "\\" + n;
        continue;
      }
      if (n === "x" || n === "u") {
        out += "\\" + n;
        continue;
      }
      if (n === "-") {
        out += inClass ? "\\-" : "-";
        continue;
      }
      if (SYNTAX.has(n) || inClass && n === "-") {
        out += "\\" + n;
        continue;
      }
      out += /[A-Za-z]/.test(n) ? "\\" + n : n;
      continue;
    }
    if (inClass) {
      if (c === "]") inClass = false;
      out += c;
      continue;
    }
    if (c === "[") {
      inClass = true;
      out += c;
      if (src[i + 1] === "^") {
        out += "^";
        i++;
      }
      if (src[i + 1] === "]") {
        out += "\\]";
        i++;
      }
      continue;
    }
    if (c === "(" && src.slice(i, i + 4) === "(?P<") {
      out += "(?<";
      i += 3;
      continue;
    }
    if (c === "{" && !/^\{\d+(,\d*)?\}/.test(src.slice(i))) {
      out += "\\{";
      continue;
    }
    if (c === "}" && !/\{\d+(,\d*)?$/.test(src.slice(0, i))) {
      out += "\\}";
      continue;
    }
    out += c;
  }
  return out;
}
function rx([src, flags], global = false) {
  const key = `${flags}${global ? "g" : ""}\0${src}`;
  let r = cache.get(key);
  if (!r) {
    r = new RegExp(pyToJs(src), `u${flags}${global ? "g" : ""}`);
    cache.set(key, r);
  }
  return r;
}
var W, D, PY_SPACE, B, WORD_CH, NB, SYNTAX, cache;
var init_regex = __esm({
  "src/seekerstream/regex.ts"() {
    "use strict";
    W = "\\p{L}\\p{N}_";
    D = "\\p{Nd}";
    PY_SPACE = "\\t\\n\\v\\f\\r \\x1c-\\x1f\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
    B = `(?:(?<=[${W}])(?![${W}])|(?<![${W}])(?=[${W}]))`;
    WORD_CH = /[\p{L}\p{N}_]/u;
    NB = `(?:(?<=[${W}])(?=[${W}])|(?<![${W}])(?![${W}]))`;
    SYNTAX = new Set("^$\\.*+?()[]{}|/".split(""));
    cache = /* @__PURE__ */ new Map();
  }
});

// src/seekerstream/prefilter.ts
function normalizeText(text) {
  let t2 = text.normalize("NFKC");
  t2 = t2.replace(HARAKAT, "");
  t2 = t2.replace(FOLD_RE, (c) => FOLD[c]);
  return t2.replace(SPACE_RUN, " ").replace(TRIM, "");
}
function countUnique(p, s) {
  return new Set(s.match(rx(p, true)) ?? []).size;
}
function prefilter(text, opts = {}) {
  const { title = "", demandContext = false, geoContext = false } = opts;
  const raw = title ? `${title}
${text}` : text;
  const norm = normalizeText(raw);
  const normTitle = title ? normalizeText(title) : "";
  const res = {
    verdict: "irrelevant",
    demandScore: 0,
    supplyScore: 0,
    languages: [],
    demandHits: [],
    supplyHits: [],
    hasPropertyTerm: false,
    hasGeoTerm: false,
    phoneCount: 0,
    reason: ""
  };
  res.phoneCount = countUnique(L.phone, norm);
  for (const [lang, pats] of L.demand) {
    let hit = false;
    for (const [src, fl, w] of pats) {
      if (test([src, fl], norm)) {
        res.demandScore += w;
        res.demandHits.push(`${lang}:${src}`);
        hit = true;
        if (normTitle && test([src, fl], normTitle)) res.demandScore += w;
      }
    }
    if (hit) res.languages.push(lang);
  }
  if (demandContext) {
    res.demandScore += 3;
    res.demandHits.push("context:wanted_section");
  }
  for (const [src, fl, w] of L.supply) {
    if (test([src, fl], norm)) {
      if (demandContext && AMBIG.has(src)) {
        res.supplyHits.push(`discounted_in_context:${src}`);
        continue;
      }
      res.supplyScore += w;
      res.supplyHits.push(src);
    }
  }
  res.hasPropertyTerm = L.property.some((p) => test(p, norm));
  res.hasGeoTerm = L.geo.some((p) => test(p, norm));
  if (res.phoneCount >= 2) {
    res.supplyScore += 4;
    res.supplyHits.push("structural:multiple_phone_numbers");
  }
  if ((norm.match(rx(L.hashtag, true)) ?? []).length >= 4) {
    res.supplyScore += 3;
    res.supplyHits.push("structural:hashtag_spam");
  }
  if ((norm.match(rx(L.url, true)) ?? []).length >= 2) {
    res.supplyScore += 2;
    res.supplyHits.push("structural:multiple_links");
  }
  if ((raw.match(rx(BULLET, true)) ?? []).length >= 3) {
    res.supplyScore += 3;
    res.supplyHits.push("structural:feature_bullet_list");
  }
  const kinds = KINDS.filter((k) => norm.includes(k));
  if (kinds.length >= 3) {
    res.supplyScore += 8;
    res.supplyHits.push("structural:many_property_types");
  }
  const head = [...norm].slice(0, 60).join("");
  if (test(OFFER_HEAD, head) && !test(WANT_HEAD, head)) {
    res.supplyScore += 5;
    res.supplyHits.push("structural:opens_with_offer");
  }
  if (!res.hasPropertyTerm) return done(res, "irrelevant", "no property vocabulary present");
  const foreign = L.nonUae.find((p) => test(p, norm));
  if (foreign && !res.hasGeoTerm) return done(res, "irrelevant", `names a non-UAE location (${foreign[0]}) and no UAE location`);
  if (!res.hasGeoTerm && !geoContext && res.demandScore < 3) return done(res, "irrelevant", "no UAE geography and weak intent");
  const job = L.notHousing.find((p) => test(p, norm));
  if (job) {
    res.supplyHits.push(`not_housing:${job[0]}`);
    return done(res, "irrelevant", `seeking employment, not housing (${job[0]})`);
  }
  if (test(L.closed, norm)) return done(res, "irrelevant", "seeker reports the search is already closed");
  const inversion = L.roleInversion.filter((p) => test(p, norm));
  if (inversion.length) {
    res.supplyScore += 6;
    res.supplyHits.push(...inversion.map((p) => `role_inversion:${p[0]}`));
    return done(res, "supply", "role inversion: searching for a counterparty, not a home");
  }
  if (res.demandScore === 0) return done(res, res.supplyScore > 0 ? "supply" : "irrelevant", "no demand markers");
  const net = res.demandScore - res.supplyScore;
  if (res.supplyScore >= 4 && net <= 0) return done(res, "supply", `strong supply evidence not outweighed (net ${net})`);
  if (res.demandScore >= 3 && net >= 0) return done(res, "demand", `strong demand markers (net +${net})`);
  if (net >= 2) return done(res, "demand", `demand outweighs supply (net +${net})`);
  if (net <= -3) return done(res, "supply", `supply dominates (net ${net})`);
  return done(res, "ambiguous", `mixed signals (demand ${res.demandScore} vs supply ${res.supplyScore})`);
}
function done(res, v, reason) {
  res.verdict = v;
  res.reason = reason;
  return res;
}
var L, SPACE_RUN, HARAKAT, FOLD, FOLD_RE, TRIM, test, AMBIG, BULLET, KINDS, OFFER_HEAD, WANT_HEAD;
var init_prefilter = __esm({
  "src/seekerstream/prefilter.ts"() {
    "use strict";
    init_lexicon();
    init_regex();
    L = lexicon_default;
    SPACE_RUN = new RegExp(`[${PY_SPACE}]+`, "gu");
    HARAKAT = /[ً-ٰٟـ]/gu;
    FOLD = {
      "\u0623": "\u0627",
      "\u0625": "\u0627",
      "\u0622": "\u0627",
      // أ إ آ → ا
      "\u0649": "\u064A",
      "\uFEEF": "\u064A",
      "\u06CC": "\u064A",
      // ى ﻯ ی → ي
      "\u0629": "\u0647",
      // ة → ه
      "\u06A9": "\u0643",
      // ک → ك
      "\uFEFB": "\u0644\u0627",
      // ﻻ → لا
      "\u0451": "\u0435"
      // ё → е
    };
    FOLD_RE = new RegExp(`[${Object.keys(FOLD).join("")}]`, "gu");
    TRIM = new RegExp(`^[${PY_SPACE}]+|[${PY_SPACE}]+$`, "gu");
    test = (p, s) => rx(p).test(s);
    AMBIG = new Set(L.contextAmbiguous);
    BULLET = ["^\\s*[-*\u2022\u2705\u2714\u{1F539}\u25AA\u{1F4CD}\u{1F4CC}\u{1F538}\u{1F3E0}\u27A1]", "m"];
    KINDS = ["\u0634\u0642\u0642", "\u0641\u0644\u0644", "\u0628\u0646\u0627\u064A\u0627\u062A", "\u0627\u0631\u0627\u0636\u064A", "\u0628\u064A\u0648\u062A", "\u0641\u0646\u0627\u062F\u0642", "\u0645\u062D\u0644\u0627\u062A", "\u0645\u0633\u062A\u0648\u062F\u0639\u0627\u062A", "\u0627\u0633\u062A\u0648\u062F\u064A\u0648\u0647\u0627\u062A", "\u0645\u0632\u0627\u0631\u0639", "\u0639\u0642\u0627\u0631\u0627\u062A", "\u0634\u0628\u0631\u0627\u062A"];
    OFFER_HEAD = ["\u0644\u0644\u0627\u064A\u062C\u0627\u0631|\u0644\u0644\u0628\u064A\u0639|\\bfor rent\\b|\\bfor sale\\b", "i"];
    WANT_HEAD = ["\u0645\u0637\u0644\u0648\u0628|\u0627\u0628\u062D\u062B|\u0646\u0628\u062D\u062B|\u0645\u062D\u062A\u0627\u062C|\u0627\u062D\u062A\u0627\u062C|\u0627\u0631\u064A\u062F|\u0627\u0628\u063A\u0649|\u0627\u062F\u0648\u0631|\u0628\u062F\u0648\u0631|\u064A\u0644\u0632\u0645\u0646\u064A|\\blooking\\b|\\bneed\\b|\\bwant|\\bsearch|\\b\u0438\u0449\u0443|\\b\u0441\u043D\u0438\u043C\u0443", "i"];
  }
});

// src/seekerstream/extract.ts
function detectLanguage(text) {
  const counts = {};
  let latin = 0;
  for (const ch of text) {
    if (!LETTER.test(ch)) continue;
    const cp = ch.codePointAt(0);
    if (cp < 592) {
      latin++;
      continue;
    }
    for (const [name, lo, hi] of SCRIPTS) if (cp >= lo && cp <= hi) {
      counts[name] = (counts[name] ?? 0) + 1;
      break;
    }
  }
  const keys = Object.keys(counts);
  if (keys.length) {
    const script = keys.reduce((a, b) => counts[b] > counts[a] ? b : a);
    if (counts[script] >= Math.max(3, Math.floor(latin / 2))) {
      if (script === "cyrillic") return "ru";
      if (script === "devanagari") return "hi";
      if (script === "arabic") {
        if (t(X._URDU_CUES, text)) return "ur";
        if (t(X._FARSI_CUES, text)) return "fa";
        return "ar";
      }
    }
  }
  if (t(X._HI_LATN_CUES, text)) return "hi_latn";
  if (t(X._TAGALOG_CUES, text)) return "tl";
  if (t(X._FRENCH_CUES, text)) return "fr";
  return "en";
}
function parseIntent(text) {
  const s = normalizeText(text);
  if (t(X._SHARE, s)) return "share";
  if (t(X._BUY, s) || t(X._WANT_FOR_SALE, s)) return "buy";
  const m = m1(X._BIG_PRICE, s);
  if (m && !t(X._RENT_HINT, s)) {
    if (m[1] || m[2] && Number(m[2]) >= 300) return "buy";
  }
  return "rent";
}
function parseBeds(text) {
  const s = normalizeText(text);
  if (t(P("\u063A\u0631\u0641\u062A\u064A\u0646|\u063A\u0631\u0641\u062A\u0627\u0646"), s)) return 2;
  if (t(X._BEDSPACE, s)) return 0;
  if (t(X._STUDIO, s)) return 0;
  if (t(P("\u063A\u0631\u0641\u0647 \u0648\u0635\u0627\u0644\u0647|\u063A\u0631\u0641\u0647 \u0648 \u0635\u0627\u0644\u0647"), s)) return 1;
  let m = m1(P("\\b(\\d)\\s*(?:-\\s*\\d\\s*)?(?:bhk|bh|br|bdrm|bdr|bd|\u0431\u0440|\u0431\u0434|\u0431\u0435\u0434\u0440\u0443\u043C|\u0431\u044D\u0434\u0440\u0443\u043C|bed ?rooms?|beds?)\\b", "i"), s);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 9) return n;
  }
  m = m1(P("\\b(\\d)\\s*rooms?\\b", "i"), s);
  if (m && !t(X._BEDSPACE, s)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 9) return n;
  }
  m = m1(P("(\\d+)\\s*(?:-\\s*\\d+\\s*)?\u063A\u0631\u0641"), s);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) return n;
  }
  if (t(P("\\b\u043E\u0434\u043D\u0443\u0448\u043A|\\b1[- ]?\u043A\u043E\u043C\u043D\u0430\u0442\u043D", "i"), s)) return 1;
  if (t(P("\\b\u0434\u0432\u0443\u0448\u043A|\\b2[- ]?\u043A\u043E\u043C\u043D\u0430\u0442\u043D", "i"), s)) return 2;
  if (t(P("\\b\u0442\u0440\u0435\u0448\u043A|\\b\u0442\u0440\u0451\u0448\u043A|\\b3[- ]?\u043A\u043E\u043C\u043D\u0430\u0442\u043D", "i"), s)) return 3;
  m = m1(P("\\b(\\d)\\s*(?:\u0441\u043F\u0430\u043B\u044C\u043D|\u043A\u043E\u043C\u043D\u0430\u0442)", "i"), s);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 9) return n;
  }
  return null;
}
function clean(x) {
  let s = x.trim().replace(/ /g, "").replace(/^[.,]+|[.,]+$/g, "");
  s = s.replace(rx(P("[.,](?=\\d{3}\\b)"), true), "");
  s = s.replace(/,/g, ".");
  if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
function parseBudget(text) {
  let s = toAsciiDigits(normalizeText(text));
  s = s.replace(rx(X._PHONE_CANDIDATE, true), " <phone> ");
  const currency = t(X._FOREIGN_CURRENCY, s) && !t(X._CURRENCY_HINT, s) ? "other" : "AED";
  let amount = null;
  let src = "";
  const mm = m1(X._M, s);
  const mk = m1(X._K, s);
  let v;
  if (mm && (v = clean(mm[1])) !== null) {
    amount = v * 1e6;
    src = mm[0];
  } else if (mk && (v = clean(mk[1])) !== null) {
    amount = v * 1e3;
    src = mk[0];
  } else {
    const chars = cps(s);
    const at = (idx) => cps(s.slice(0, idx)).length;
    const window = (m) => {
      const st = at(m.index), en = st + cps(m[0]).length;
      return chars.slice(Math.max(0, st - 28), en + 18).join("");
    };
    let found = false;
    for (const m of s.matchAll(rx(X._PLAIN, true))) {
      if (t(X._NOT_MONEY, window(m))) continue;
      const val = clean(m[1]);
      if (val !== null && val >= 1e3 && val <= 5e6) {
        amount = val;
        src = m[0];
        found = true;
        break;
      }
    }
    if (!found) {
      for (const m of s.matchAll(rx(X._SHORT, true))) {
        const w = window(m);
        if (t(X._NOT_MONEY, w) || !t(X._MONEY_CUE, w)) continue;
        const val = clean(m[1]);
        if (val !== null && val >= 300 && val <= 999) {
          amount = val;
          src = m[0];
          break;
        }
      }
    }
  }
  if (amount === null) return null;
  let period;
  if (t(X._MONTHLY_CUE, s)) period = "month";
  else if (t(X._YEARLY_CUE, s)) period = "year";
  else if (amount <= 4e3) period = "month";
  else period = "unknown";
  return { amount: Math.trunc(amount), period, currency, source: src.trim() };
}
function parseAreas(text) {
  const s = normalizeText(text);
  let found = AREAS.filter(([, src, fl]) => t([src, fl], s)).map(([name]) => name);
  if (found.length > 1 && found.includes("Dubai")) found = [...found.filter((f) => f !== "Dubai"), "Dubai"];
  return found;
}
function parseUrgency(text) {
  const s = normalizeText(text);
  for (const [src, fl, why] of URGENT) if (t([src, fl], s)) return [true, why];
  return [false, ""];
}
function normalizeUaeMobile(raw) {
  let s = toAsciiDigits(raw ?? "").replace(/\D+/g, "");
  if (!s) return null;
  if (s.startsWith("00971")) s = s.slice(5);
  else if (s.startsWith("971")) s = s.slice(3);
  else if (s.startsWith("0")) s = s.slice(1);
  else if ((s.length === 9 || s.length === 10) && s[0] === "5") {
  } else if (s.length > 12) return null;
  s = s.replace(/^0+/, "");
  if (!s || s[0] !== "5" || s.length !== 9) return null;
  const prefix = s.slice(0, 2);
  if (!MOBILE.has(prefix)) return null;
  return { e164: `+971${s}`, national: `0${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5)}`, operator: OPERATOR[prefix] ?? null };
}
function extractPhones(body) {
  const s = toAsciiDigits(body);
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const m of s.matchAll(rx(X._PHONE_CANDIDATE, true))) {
    const r = normalizeUaeMobile(m[0]);
    if (r && !seen.has(r.e164)) {
      seen.add(r.e164);
      out.push(r);
    }
  }
  return out;
}
function extract(text) {
  const [urgent, why] = parseUrgency(text);
  return {
    language: detectLanguage(text),
    intent: parseIntent(text),
    beds: parseBeds(text),
    budget: parseBudget(text),
    areas: parseAreas(text),
    urgent,
    urgencyReason: why,
    phones: extractPhones(text)
  };
}
var X, AREAS, URGENT, t, m1, SCRIPTS, LETTER, P, AR_DIGITS, toAsciiDigits, cps, MOBILE, OPERATOR;
var init_extract = __esm({
  "src/seekerstream/extract.ts"() {
    "use strict";
    init_lexicon();
    init_regex();
    init_prefilter();
    X = lexicon_default.x;
    AREAS = lexicon_default.areas;
    URGENT = lexicon_default.urgent;
    t = (p, s) => rx(p).test(s);
    m1 = (p, s) => rx(p).exec(s);
    SCRIPTS = [
      ["arabic", 1536, 1791],
      ["arabic", 1872, 1919],
      ["arabic", 64336, 65023],
      ["arabic", 65136, 65279],
      ["cyrillic", 1024, 1279],
      ["devanagari", 2304, 2431]
    ];
    LETTER = new RegExp("\\p{L}", "u");
    P = (src, fl = "") => [src, fl];
    AR_DIGITS = /[٠-٩۰-۹]/gu;
    toAsciiDigits = (s) => s.replace(AR_DIGITS, (d) => String(d.codePointAt(0) - (d >= "\u06F0" ? 1776 : 1632)));
    cps = (s) => [...s];
    MOBILE = /* @__PURE__ */ new Set(["50", "52", "54", "55", "56", "58"]);
    OPERATOR = { "50": "e& (Etisalat)", "54": "e& (Etisalat)", "56": "e& (Etisalat)", "52": "du", "55": "du", "58": "du" };
  }
});

// src/seekerstream/ingest.ts
import { createHash } from "node:crypto";
function fingerprint(text, title = "") {
  const basis = [...normalizeText(`${title} ${text}`).toLowerCase()].slice(0, 600).join("");
  return createHash("sha256").update(basis, "utf8").digest("hex").slice(0, 32);
}
function emirateOf(areas) {
  for (const a of areas) if (EMIRATE_OF[a]) return EMIRATE_OF[a];
  return areas.length ? "Dubai" : null;
}
function scoreLead(ex, phone, consent) {
  let s = 35;
  if (phone) s += 25;
  if (consent) s += 15;
  if (ex.budget && ex.budget.currency === "AED") s += 10;
  if (ex.areas.length) s += 8;
  if (ex.beds !== null) s += 4;
  if (ex.urgent) s += 10;
  return Math.min(100, s);
}
function evaluate(post) {
  const ex = extract(`${post.title ? post.title + "\n" : ""}${post.text}`);
  if (post.isBot) return { post, pf: null, ex, keep: false, why: "bot" };
  if (post.consent) {
    const ok = !!normalizeUaeMobile(post.phone ?? "");
    return { post, pf: null, ex, keep: ok, why: ok ? "form with consent" : "form without a valid UAE mobile" };
  }
  const pf = prefilter(post.text, { title: post.title, geoContext: post.source === "telegram" });
  if (pf.verdict === "demand" && AD_TELLS.test(post.text)) return { post, pf, ex, keep: false, why: "broker advert / company requirement" };
  return { post, pf, ex, keep: pf.verdict === "demand", why: pf.reason };
}
async function storeLeads(db, items) {
  let created = 0;
  for (const it of items) {
    if (!it.keep) continue;
    const p = it.post;
    const phone = normalizeUaeMobile(p.phone ?? "")?.e164 ?? it.ex.phones[0]?.e164 ?? null;
    if (phone) {
      const sup = await db.query("select 1 from market_suppression where phone = $1", [phone]);
      if (sup.rowCount) continue;
    }
    if (p.source === "telegram" && p.authorHandle) {
      const seen = await db.query(
        "select 1 from market_leads where author_handle = $1 and detected_at > now() - interval '14 days' limit 1",
        [p.authorHandle]
      );
      if (seen.rowCount) continue;
    }
    const ex = it.ex;
    const r = await db.query(
      `insert into market_leads (source, external_id, fingerprint, channel, channel_title, permalink, author_handle, author_name,
         body, language, intent, beds, budget, budget_period, areas, emirate, urgent, urgency_reason, phone, name, email, consent,
         score, reason, posted_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       on conflict do nothing returning id`,
      [
        p.source,
        p.externalId,
        fingerprint(p.text, p.title),
        p.channel ?? null,
        p.channelTitle ?? null,
        p.permalink ?? null,
        p.authorHandle || null,
        p.authorName || null,
        p.text.slice(0, 4e3),
        ex.language,
        ex.intent,
        ex.beds,
        ex.budget && ex.budget.currency === "AED" ? ex.budget.amount : null,
        ex.budget?.period ?? null,
        ex.areas,
        p.emirate || emirateOf(ex.areas),
        ex.urgent,
        ex.urgencyReason || null,
        phone,
        p.name || null,
        p.email || null,
        !!p.consent,
        scoreLead(ex, phone, !!p.consent),
        it.why,
        p.postedAt ?? null
      ]
    );
    created += r.rowCount ?? 0;
  }
  return created;
}
var EMIRATE_OF, AD_TELLS, AD_TELLS_PG;
var init_ingest = __esm({
  "src/seekerstream/ingest.ts"() {
    "use strict";
    init_prefilter();
    init_extract();
    EMIRATE_OF = {
      "Sharjah": "Sharjah",
      "Ajman": "Ajman",
      "Abu Dhabi": "Abu Dhabi",
      "Al Reem Island": "Abu Dhabi",
      "Yas Island": "Abu Dhabi",
      "Saadiyat": "Abu Dhabi",
      "Khalifa City": "Abu Dhabi",
      "Al Ain": "Abu Dhabi",
      "Ras Al Khaimah": "Ras Al Khaimah",
      "Fujairah": "Fujairah",
      "Umm Al Quwain": "Umm Al Quwain"
    };
    AD_TELLS = /agents? (are )?(always )?welcome|have a client looking|we specialize|\d+\+? units|units (available|for sale)|buyer-side commission|commission is 100%|viewings available|presentations? sent|serious cash buyer|labou?r camps?|staff accommodation for \d{2,}|ищем клиента|есть клиент(ы)? (на|для)|для (наших )?клиент/i;
    AD_TELLS_PG = "agents? (are )?(always )?welcome|have a client looking|we specialize|[0-9]+[+]? units|units (available|for sale)|buyer-side commission|commission is 100%|viewings available|presentations? sent|serious cash buyer|labou?r camps?|staff accommodation for [0-9]{2,}";
  }
});

// src/seekerstream/telegram.ts
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
function telegramConfigured() {
  return !!(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH && process.env.TELEGRAM_SESSION);
}
async function connectTelegram() {
  const client = new TelegramClient(
    new StringSession(process.env.TELEGRAM_SESSION),
    Number(process.env.TELEGRAM_API_ID),
    process.env.TELEGRAM_API_HASH,
    { connectionRetries: 2, requestRetries: 1, floodSleepThreshold: 10, autoReconnect: false }
  );
  client.setLogLevel("error");
  await client.connect();
  if (!await client.checkAuthorization()) throw new Error("TELEGRAM_SESSION is not authorised");
  return client;
}
async function seedSources(db) {
  for (const h of SEED_GROUPS) {
    await db.query("insert into market_sources (id, kind, handle) values ($1,'telegram',$2) on conflict do nothing", [`telegram:${h.toLowerCase()}`, h]);
  }
}
async function scanTelegram(client, db, deadline) {
  const { rows } = await db.query(
    "select id, handle, cursor from market_sources where kind = 'telegram' and enabled order by last_scan_at asc nulls first limit 60"
  );
  const posts = [];
  let scanned = 0;
  const users = /* @__PURE__ */ new Map();
  const userOf = async (m) => {
    if (m.sender instanceof Api.User) return m.sender;
    const id = m.senderId?.toString();
    if (!id) return null;
    if (users.has(id)) return users.get(id);
    let u = null;
    try {
      const e = await client.getEntity(m.senderId);
      if (e instanceof Api.User) u = e;
    } catch {
    }
    users.set(id, u);
    return u;
  };
  for (const s of rows) {
    if (Date.now() > deadline) break;
    try {
      const entity = await client.getEntity(s.handle);
      if (!(entity instanceof Api.Channel) || entity.broadcast || !entity.username) throw new Error("not a group (broadcast channel or private)");
      const cursor = Number(s.cursor) || 0;
      const msgs = await client.getMessages(entity, cursor ? { minId: cursor, limit: 100 } : { limit: 60 });
      let maxId = cursor;
      const dayAgo = Date.now() / 1e3 - 86400;
      for (const m of msgs) {
        if (!(m instanceof Api.Message)) continue;
        if (m.id > maxId) maxId = m.id;
        if (!m.message || !cursor && m.date < dayAgo) continue;
        const sender = await userOf(m);
        const isUser = !!sender;
        posts.push({
          source: "telegram",
          externalId: `tg:${s.handle.toLowerCase()}:${m.id}`,
          text: m.message,
          authorHandle: sender?.username ?? null,
          authorName: sender ? [sender.firstName, sender.lastName].filter(Boolean).join(" ") || null : null,
          permalink: `https://t.me/${entity.username}/${m.id}`,
          postedAt: new Date(m.date * 1e3),
          channel: entity.username,
          channelTitle: entity.title,
          isBot: !!sender?.bot
        });
      }
      scanned += msgs.length;
      await db.query(
        "update market_sources set cursor = $2, title = $3, last_scan_at = now(), last_error = null, scanned_total = scanned_total + $4 where id = $1",
        [s.id, maxId, entity.title, msgs.length]
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const flood = /FLOOD_WAIT|wait of (\d+)/i.test(msg);
      await db.query(
        "update market_sources set last_scan_at = now(), last_error = $2, enabled = case when $3 then false else enabled end where id = $1",
        [s.id, msg.slice(0, 300), DEAD.test(msg)]
      );
      if (flood) break;
    }
  }
  return { posts, scanned };
}
async function discoverGroups(client, db, queries) {
  let added = 0;
  for (const q of queries) {
    const res = await client.invoke(new Api.contacts.Search({ q, limit: 25 }));
    for (const c of res.chats) {
      if (!(c instanceof Api.Channel) || !c.megagroup || !c.username) continue;
      if ((c.participantsCount ?? 0) > 0 && (c.participantsCount ?? 0) < 150) continue;
      if (!HOUSING_WORDS.test(`${c.title} ${c.username}`) || !UAE_WORDS.test(`${c.title} ${c.username}`)) continue;
      const r = await db.query(
        "insert into market_sources (id, kind, handle, title) values ($1,'telegram',$2,$3) on conflict do nothing",
        [`telegram:${c.username.toLowerCase()}`, c.username, c.title]
      );
      added += r.rowCount ?? 0;
    }
  }
  return added;
}
async function searchSeekers(client, db, queries, deadline) {
  const posts = [];
  const groups = /* @__PURE__ */ new Map();
  const minDate = Math.floor(Date.now() / 1e3) - 3 * 86400;
  for (const q of queries) {
    if (Date.now() > deadline) break;
    let res;
    try {
      res = await client.invoke(new Api.messages.SearchGlobal({
        q,
        filter: new Api.InputMessagesFilterEmpty(),
        minDate,
        maxDate: 0,
        offsetRate: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        offsetId: 0,
        limit: 50
      }));
    } catch (e) {
      if (/FLOOD_WAIT|wait of/i.test(e instanceof Error ? e.message : String(e))) break;
      continue;
    }
    if (!("messages" in res)) continue;
    const chats = /* @__PURE__ */ new Map();
    for (const c of res.chats) if (c instanceof Api.Channel) chats.set(c.id.toString(), c);
    const users = /* @__PURE__ */ new Map();
    for (const u of res.users) if (u instanceof Api.User) users.set(u.id.toString(), u);
    for (const m of res.messages) {
      if (!(m instanceof Api.Message) || !m.message || m.date < minDate) continue;
      if (!(m.peerId instanceof Api.PeerChannel)) continue;
      const ch = chats.get(m.peerId.channelId.toString());
      if (!ch || ch.broadcast || !ch.username) continue;
      const from = m.fromId instanceof Api.PeerUser ? users.get(m.fromId.userId.toString()) : void 0;
      posts.push({
        source: "telegram",
        externalId: `tg:${ch.username.toLowerCase()}:${m.id}`,
        text: m.message,
        authorHandle: from?.username ?? null,
        authorName: from ? [from.firstName, from.lastName].filter(Boolean).join(" ") || null : null,
        permalink: `https://t.me/${ch.username}/${m.id}`,
        postedAt: new Date(m.date * 1e3),
        channel: ch.username,
        channelTitle: ch.title,
        isBot: !!from?.bot
      });
      if (HOUSING_WORDS.test(`${ch.title} ${ch.username}`) || UAE_WORDS.test(`${ch.title} ${ch.username}`)) groups.set(ch.username, ch.title);
    }
  }
  let added = 0;
  for (const [u, title] of groups) {
    const r = await db.query("insert into market_sources (id, kind, handle, title) values ($1,'telegram',$2,$3) on conflict do nothing", [`telegram:${u.toLowerCase()}`, u, title]);
    added += r.rowCount ?? 0;
  }
  return { posts, added };
}
var SEED_GROUPS, DISCOVERY_QUERIES, HOUSING_WORDS, UAE_WORDS, DEAD, SEEK_QUERIES;
var init_telegram = __esm({
  "src/seekerstream/telegram.ts"() {
    "use strict";
    SEED_GROUPS = [
      "nedvizhimost_dubai_rent",
      "DubaiRentArenda",
      "uae_apartments_rent",
      "rent_in_dubai",
      "dubairenta",
      "dubai_rooms_rent",
      "russians_v_dubai",
      "dubairooms",
      "filipinodubai",
      "nedvij_dubai_chat",
      "abudabi_appart",
      "dubai_arenda",
      "apartsforrent",
      "dubai_relocation",
      "roomsdubai"
    ];
    DISCOVERY_QUERIES = [
      // Russian
      "\u0430\u0440\u0435\u043D\u0434\u0430 \u0414\u0443\u0431\u0430\u0439",
      "\u0441\u043D\u044F\u0442\u044C \u043A\u0432\u0430\u0440\u0442\u0438\u0440\u0443 \u0414\u0443\u0431\u0430\u0439",
      "\u043D\u0435\u0434\u0432\u0438\u0436\u0438\u043C\u043E\u0441\u0442\u044C \u041E\u0410\u042D",
      "\u0410\u0431\u0443-\u0414\u0430\u0431\u0438 \u0430\u0440\u0435\u043D\u0434\u0430",
      "\u0428\u0430\u0440\u0434\u0436\u0430 \u0430\u0440\u0435\u043D\u0434\u0430",
      "\u043A\u043E\u043C\u043D\u0430\u0442\u044B \u0414\u0443\u0431\u0430\u0439",
      "\u0441\u043D\u0438\u043C\u0443 \u0414\u0443\u0431\u0430\u0439",
      "\u0430\u0440\u0435\u043D\u0434\u0430 \u0414\u0443\u0431\u0430\u0439 \u0431\u0435\u0437 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438",
      "\u0436\u0438\u043B\u044C\u0435 \u0414\u0443\u0431\u0430\u0439",
      "\u043A\u0432\u0430\u0440\u0442\u0438\u0440\u044B \u0414\u0443\u0431\u0430\u0439 \u0430\u0440\u0435\u043D\u0434\u0430 \u0447\u0430\u0442",
      "\u0430\u0440\u0435\u043D\u0434\u0430 \u0410\u0434\u0436\u043C\u0430\u043D",
      "\u0430\u0440\u0435\u043D\u0434\u0430 \u0420\u0430\u0441-\u044D\u043B\u044C-\u0425\u0430\u0439\u043C\u0430",
      // English
      "Dubai rent",
      "Dubai rooms",
      "Dubai flats",
      "Abu Dhabi rent",
      "Sharjah rooms",
      "UAE property",
      "bed space Dubai",
      "Dubai room sharing",
      "Dubai accommodation",
      "Dubai partition room",
      "Dubai master room",
      "Sharjah bachelor",
      "Ajman rent",
      "UAE flat share",
      "Dubai studio for rent",
      "Dubai housing group",
      "Dubai apartments chat",
      "UAE rent group",
      "Dubai roommates",
      // Arabic
      "\u0633\u0643\u0646 \u062F\u0628\u064A",
      "\u0627\u064A\u062C\u0627\u0631 \u062F\u0628\u064A",
      "\u0639\u0642\u0627\u0631\u0627\u062A \u0627\u0644\u0627\u0645\u0627\u0631\u0627\u062A",
      "\u0634\u0642\u0642 \u0644\u0644\u0627\u064A\u062C\u0627\u0631 \u0627\u0644\u0634\u0627\u0631\u0642\u0629",
      "\u0633\u0643\u0646 \u0627\u0628\u0648\u0638\u0628\u064A",
      "\u0645\u0637\u0644\u0648\u0628 \u0634\u0642\u0629 \u062F\u0628\u064A",
      "\u0627\u064A\u062C\u0627\u0631 \u0639\u062C\u0645\u0627\u0646",
      "\u063A\u0631\u0641 \u0644\u0644\u0627\u064A\u062C\u0627\u0631 \u0627\u0644\u0627\u0645\u0627\u0631\u0627\u062A",
      "\u0633\u0643\u0646 \u0639\u0632\u0627\u0628 \u062F\u0628\u064A",
      "\u0634\u0642\u0642 \u0627\u0628\u0648\u0638\u0628\u064A \u0627\u064A\u062C\u0627\u0631",
      "\u0639\u0642\u0627\u0631\u0627\u062A \u062F\u0628\u064A \u0645\u062C\u0645\u0648\u0639\u0629",
      // South Asian / Filipino communities
      "Dubai kamra",
      "Dubai room rent Pakistan",
      "Dubai flat Kerala",
      "Dubai room Malayalam",
      "Dubai accommodation Indians",
      "Dubai bedspace Pinoy",
      "Dubai room Filipino",
      "Dubai room Nepal",
      "Dubai accommodation Bangladesh",
      "Sharjah bed space"
    ];
    HOUSING_WORDS = /rent|room|flat|apartment|propert|real ?estate|housing|bed ?space|accommodation|аренд|снять|сним|недвиж|квартир|комнат|жиль|عقار|سكن|ايجار|إيجار|شقق|غرف|kamra|ghar/iu;
    UAE_WORDS = /dubai|uae|abu ?dhabi|sharjah|ajman|emirates|дубай|оаэ|абу|шардж|эмират|دبي|الامارات|الإمارات|ابوظبي|أبوظبي|الشارقة|عجمان/iu;
    DEAD = /USERNAME_NOT_OCCUPIED|USERNAME_INVALID|CHANNEL_PRIVATE|CHANNEL_INVALID|No user has|Cannot find any entity|not a group/i;
    SEEK_QUERIES = [
      "\u0438\u0449\u0443 \u0441\u0442\u0443\u0434\u0438\u044E \u0414\u0443\u0431\u0430\u0439",
      "\u0438\u0449\u0443 \u043A\u043E\u043C\u043D\u0430\u0442\u0443 \u0414\u0443\u0431\u0430\u0439",
      "\u0441\u043D\u0438\u043C\u0443 \u043A\u0432\u0430\u0440\u0442\u0438\u0440\u0443 \u0414\u0443\u0431\u0430\u0439",
      "\u0438\u0449\u0443 1 bedroom \u0414\u0443\u0431\u0430\u0439",
      "\u0441\u043D\u0438\u043C\u0443 \u0428\u0430\u0440\u0434\u0436\u0430",
      "\u0438\u0449\u0443 \u043A\u0432\u0430\u0440\u0442\u0438\u0440\u0443 \u0410\u0431\u0443-\u0414\u0430\u0431\u0438",
      "looking for studio Dubai",
      "looking for room Dubai",
      "need bedspace Dubai",
      "looking for 1 bedroom Dubai",
      "looking for apartment Abu Dhabi",
      "looking to buy apartment Dubai",
      "need room Sharjah",
      "looking for flat Ajman",
      "\u0645\u0637\u0644\u0648\u0628 \u0634\u0642\u0629 \u0644\u0644\u0627\u064A\u062C\u0627\u0631 \u062F\u0628\u064A",
      "\u0627\u0628\u062D\u062B \u0639\u0646 \u0634\u0642\u0629 \u062F\u0628\u064A",
      "\u0627\u0628\u063A\u0649 \u0634\u0642\u0629 \u0627\u0644\u0634\u0627\u0631\u0642\u0629",
      "\u0645\u0637\u0644\u0648\u0628 \u063A\u0631\u0641\u0629 \u062F\u0628\u064A",
      "\u0627\u0628\u062D\u062B \u0639\u0646 \u0633\u0643\u0646 \u0627\u0628\u0648\u0638\u0628\u064A",
      "\u0645\u0637\u0644\u0648\u0628 \u0634\u0642\u0629 \u0639\u062C\u0645\u0627\u0646"
    ];
  }
});

// src/seekerstream/scan.ts
var scan_exports = {};
__export(scan_exports, {
  runScan: () => runScan
});
async function alertOwner(db, text) {
  const to = process.env.SEEKERSTREAM_ALERT_EMAIL, key = process.env.RESEND_API_KEY;
  if (!to || !key) return;
  const recent = await db.query("select 1 from market_runs where note like 'ALERT sent%' and started_at > now() - interval '12 hours' limit 1");
  if (recent.rowCount) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "Corehold <onboarding@resend.dev>", to, subject: "Corehold: SeekerStream needs attention", text })
  }).catch(() => null);
  await db.query("insert into market_runs (ms, note) values (0, $1)", [`ALERT sent (${r?.status ?? "no response"})`]);
}
async function runScan(opts = {}) {
  const t0 = Date.now();
  const budgetMs = Math.min(Number(process.env.SS_BUDGET_CAP_MS ?? 21e3), Math.max(opts.budgetMs ?? 0, 14e3));
  if (process.env.SEEKERSTREAM_ENABLED === "false") return { skipped: "disabled" };
  return withClient(async (db) => {
    await ensureSchema(db);
    await seedSources(db);
    if (!telegramConfigured()) {
      await db.query("insert into market_runs (ms, note) values ($1, 'telegram not configured')", [Date.now() - t0]);
      return { skipped: "telegram not configured" };
    }
    let client;
    try {
      client = await connectTelegram();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await db.query("insert into market_runs (ms, note) values ($1, $2)", [Date.now() - t0, `ERROR connect: ${msg.slice(0, 200)}`]);
      await alertOwner(db, `SeekerStream cannot connect to Telegram: ${msg}. Leads stop until a fresh TELEGRAM_SESSION is set in Netlify.`);
      throw e;
    }
    let scanned = 0, created = 0, discovered = 0;
    const notes = [];
    try {
      const { posts, scanned: n } = await scanTelegram(client, db, t0 + budgetMs);
      scanned = n;
      created = await storeLeads(db, posts.map(evaluate));
      try {
        const k = Math.floor(Date.now() / 9e5) % Math.ceil(SEEK_QUERIES.length / 4);
        const found = await searchSeekers(client, db, SEEK_QUERIES.slice(k * 4, k * 4 + 4), t0 + budgetMs + 8e3);
        const more = await storeLeads(db, found.posts.map(evaluate));
        created += more;
        scanned += found.posts.length;
        notes.push(`search ${found.posts.length} posts, +${more} leads, +${found.added} groups`);
      } catch (e) {
        notes.push(`search failed: ${e instanceof Error ? e.message : e}`);
      }
      await db.query("update market_leads set hidden = true where not hidden and claimed_org is null and source = 'telegram' and body ~* $1", [AD_TELLS_PG]);
      const last = await db.query("select max(started_at) as at from market_runs where note like '%discovery%'");
      const due = !last.rows[0]?.at || Date.now() - new Date(last.rows[0].at).getTime() > 36e5;
      if (due && Date.now() - t0 < budgetMs + 8e3) {
        const k = Math.floor(Date.now() / 36e5) % Math.ceil(DISCOVERY_QUERIES.length / 4);
        try {
          discovered = await discoverGroups(client, db, DISCOVERY_QUERIES.slice(k * 4, k * 4 + 4));
          notes.push(`discovery +${discovered}`);
        } catch (e) {
          notes.push(`discovery failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    } finally {
      await client.destroy().catch(() => {
      });
    }
    const ms = Date.now() - t0;
    await db.query("insert into market_runs (ms, scanned, leads, note) values ($1,$2,$3,$4)", [ms, scanned, created, notes.join("; ") || null]);
    return { ms, scanned, created, discovered };
  });
}
var init_scan = __esm({
  "src/seekerstream/scan.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_ingest();
    init_telegram();
  }
});

// worker/run.mts
process.env.SS_BUDGET_CAP_MS ??= "120000";
var { runScan: runScan2 } = await Promise.resolve().then(() => (init_scan(), scan_exports));
var interval = Math.max(15, Number(process.env.SS_INTERVAL_SECONDS ?? 60)) * 1e3;
var budget = Math.max(10, Number(process.env.SS_BUDGET_SECONDS ?? 40)) * 1e3;
var stop = false;
var endAt = Date.now() + Number(process.env.SS_MAX_MINUTES ?? 0) * 6e4;
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => {
  stop = true;
});
console.log(`[seekerstream-worker] started: every ${interval / 1e3}s, read budget ${budget / 1e3}s`);
while (!stop && !(process.env.SS_MAX_MINUTES && Date.now() > endAt)) {
  const t0 = Date.now();
  try {
    console.log("[seekerstream-worker]", (/* @__PURE__ */ new Date()).toISOString(), JSON.stringify(await runScan2({ budgetMs: budget })));
  } catch (e) {
    console.error("[seekerstream-worker] scan failed:", e instanceof Error ? e.message : e);
  }
  if (process.env.SS_ONCE === "1") break;
  const wait = Math.max(5e3, interval - (Date.now() - t0));
  for (let waited = 0; waited < wait && !stop; waited += 1e3) await new Promise((r) => setTimeout(r, 1e3));
}
process.exit(0);
