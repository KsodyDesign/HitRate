-- Схема базы данных HitRate (PostgreSQL 15+)
-- 6 таблиц в 3-й нормальной форме, только листовки, один QR на объявление.

CREATE TABLE IF NOT EXISTS campaigns (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(160) NOT NULL,
    goal        VARCHAR(200) NOT NULL DEFAULT '',
    status      VARCHAR(20)  NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'archived')),
    start_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
    end_date    DATE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ads (
    id               SERIAL PRIMARY KEY,
    campaign_id      INTEGER       NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title            VARCHAR(160)  NOT NULL,
    print_size       VARCHAR(40)   NOT NULL DEFAULT 'A6 · 105 x 148 мм',
    goal             VARCHAR(200)  NOT NULL DEFAULT '',
    offer            TEXT          NOT NULL DEFAULT '',
    audience         TEXT          NOT NULL DEFAULT '',
    unit_cost        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    print_run        INTEGER       NOT NULL DEFAULT 0 CHECK (print_run >= 0),
    extra_cost       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (extra_cost >= 0),
    is_free          BOOLEAN       NOT NULL DEFAULT FALSE,
    status           VARCHAR(20)   NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    image_path       TEXT,
    final_image_path TEXT,
    activated_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_campaign_id ON ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);

CREATE TABLE IF NOT EXISTS qr_links (
    id          SERIAL PRIMARY KEY,
    ad_id       INTEGER     NOT NULL UNIQUE REFERENCES ads(id) ON DELETE CASCADE,
    short_code  VARCHAR(16) NOT NULL UNIQUE,
    target_url  TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_redirect_history (
    id          SERIAL PRIMARY KEY,
    qr_link_id  INTEGER     NOT NULL REFERENCES qr_links(id) ON DELETE CASCADE,
    old_url     TEXT,
    new_url     TEXT        NOT NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_redirect_history_link ON qr_redirect_history(qr_link_id);

CREATE TABLE IF NOT EXISTS qr_clicks (
    id           BIGSERIAL PRIMARY KEY,
    qr_link_id   INTEGER     NOT NULL REFERENCES qr_links(id) ON DELETE CASCADE,
    clicked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_test      BOOLEAN     NOT NULL DEFAULT FALSE,
    is_bot       BOOLEAN     NOT NULL DEFAULT FALSE,
    visitor_hash VARCHAR(64) NOT NULL DEFAULT '',
    user_agent   TEXT        NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_qr_clicks_link_time ON qr_clicks(qr_link_id, clicked_at);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id            SERIAL PRIMARY KEY,
    ad_id         INTEGER      NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    verdict       VARCHAR(10)  NOT NULL CHECK (verdict IN ('green', 'red')),
    score         NUMERIC(5,2) NOT NULL DEFAULT 0,
    main_element  TEXT         NOT NULL DEFAULT '',
    main_goal     TEXT         NOT NULL DEFAULT '',
    pros_json     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    cons_json     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    summary       TEXT         NOT NULL DEFAULT '',
    similar_count INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_ad_id ON ai_analyses(ad_id);
