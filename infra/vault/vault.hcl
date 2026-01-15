# HashiCorp Vault Configuration
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = "true"  # Enable TLS in production
}

storage "file" {
  path = "/vault/data"
}

api_addr = "http://0.0.0.0:8200"
cluster_addr = "https://127.0.0.1:8201"

ui = true

# Telemetry for Prometheus
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}

# Default lease durations
default_lease_ttl = "768h"
max_lease_ttl = "768h"
