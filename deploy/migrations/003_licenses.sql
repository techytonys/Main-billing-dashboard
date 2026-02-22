CREATE TABLE IF NOT EXISTS licenses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  license_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  max_activations INTEGER DEFAULT 0,
  activation_count INTEGER DEFAULT 0,
  last_activated_at TIMESTAMP,
  last_activated_ip TEXT,
  last_activated_hostname TEXT,
  expires_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_activations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id VARCHAR NOT NULL,
  server_id VARCHAR,
  server_ip TEXT,
  hostname TEXT,
  activated_at TIMESTAMP DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  released_at TIMESTAMP
);
