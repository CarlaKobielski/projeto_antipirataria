# Policy for ProtecLiter application secrets
path "secret/data/protecliter/*" {
  capabilities = ["read"]
}

path "secret/metadata/protecliter/*" {
  capabilities = ["list"]
}

# Database credentials
path "database/creds/protecliter-app" {
  capabilities = ["read"]
}

# AWS credentials for S3
path "aws/creds/protecliter-s3" {
  capabilities = ["read"]
}

# Stripe API keys
path "secret/data/protecliter/stripe" {
  capabilities = ["read"]
}

# JWT secrets
path "secret/data/protecliter/jwt" {
  capabilities = ["read"]
}

# Email/SMTP credentials
path "secret/data/protecliter/smtp" {
  capabilities = ["read"]
}
