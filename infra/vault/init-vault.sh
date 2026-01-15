#!/bin/bash
# Vault initialization script for ProtecLiter
# Run this after starting Vault for the first time

set -e

VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}

echo "Waiting for Vault to be ready..."
until curl -s ${VAULT_ADDR}/v1/sys/health > /dev/null 2>&1; do
  sleep 1
done

echo "Initializing Vault..."
INIT_OUTPUT=$(vault operator init -key-shares=5 -key-threshold=3 -format=json)

# Save the keys securely
echo "$INIT_OUTPUT" > /tmp/vault-init.json
echo "⚠️  IMPORTANT: Save the unseal keys and root token from /tmp/vault-init.json"

# Extract root token and unseal keys
ROOT_TOKEN=$(echo $INIT_OUTPUT | jq -r '.root_token')
UNSEAL_KEY_1=$(echo $INIT_OUTPUT | jq -r '.unseal_keys_b64[0]')
UNSEAL_KEY_2=$(echo $INIT_OUTPUT | jq -r '.unseal_keys_b64[1]')
UNSEAL_KEY_3=$(echo $INIT_OUTPUT | jq -r '.unseal_keys_b64[2]')

echo "Unsealing Vault..."
vault operator unseal $UNSEAL_KEY_1
vault operator unseal $UNSEAL_KEY_2
vault operator unseal $UNSEAL_KEY_3

echo "Logging in..."
export VAULT_TOKEN=$ROOT_TOKEN

echo "Enabling secrets engines..."
vault secrets enable -path=secret kv-v2
vault secrets enable database
vault secrets enable aws

echo "Creating policies..."
vault policy write protecliter-app /vault/policies/protecliter-app.hcl

echo "Creating development secrets..."
# Database
vault kv put secret/protecliter/database \
  host=postgres \
  port=5432 \
  database=protecliter_dev \
  username=protecliter \
  password=protecliter_dev

# JWT
vault kv put secret/protecliter/jwt \
  secret=your-super-secret-jwt-key-change-in-production \
  expires_in=15m \
  refresh_expires_in=7d

# Stripe (use test keys)
vault kv put secret/protecliter/stripe \
  secret_key=sk_test_your_stripe_secret_key \
  webhook_secret=whsec_your_webhook_secret \
  price_starter=price_starter_id \
  price_professional=price_professional_id \
  price_enterprise=price_enterprise_id

# SMTP
vault kv put secret/protecliter/smtp \
  host=mailhog \
  port=1025 \
  user="" \
  password="" \
  from=noreply@protecliter.com

# S3/MinIO
vault kv put secret/protecliter/s3 \
  endpoint=http://minio:9000 \
  access_key=minioadmin \
  secret_key=minioadmin \
  bucket=protecliter-evidence

# Elasticsearch
vault kv put secret/protecliter/elasticsearch \
  url=http://elasticsearch:9200 \
  username=elastic \
  password=elastic_dev

echo "Creating AppRole for services..."
vault auth enable approle

vault write auth/approle/role/protecliter-services \
  token_policies="protecliter-app" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=0 \
  secret_id_num_uses=0

# Get role ID and secret ID
ROLE_ID=$(vault read -format=json auth/approle/role/protecliter-services/role-id | jq -r '.data.role_id')
SECRET_ID=$(vault write -format=json -f auth/approle/role/protecliter-services/secret-id | jq -r '.data.secret_id')

echo ""
echo "============================================="
echo "Vault initialized successfully!"
echo "============================================="
echo ""
echo "Root Token: $ROOT_TOKEN"
echo ""
echo "AppRole credentials for services:"
echo "  VAULT_ROLE_ID: $ROLE_ID"
echo "  VAULT_SECRET_ID: $SECRET_ID"
echo ""
echo "⚠️  Store these credentials securely!"
echo "============================================="
