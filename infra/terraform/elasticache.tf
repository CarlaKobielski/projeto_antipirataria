resource "aws_elasticache_replication_group" "default" {
  replication_group_id          = "protecliter-redis-${var.environment}"
  description                   = "Redis cluster for ProtecLiter ${var.environment}"
  node_type                     = "cache.t3.medium"
  num_cache_clusters            = 2 # Primary + 1 Replica
  parameter_group_name          = "default.redis7"
  port                          = 6379
  multi_az_enabled              = false # Set true for HA
  automatic_failover_enabled    = true
  subnet_group_name             = module.vpc.elasticache_subnet_group_name
  security_group_ids            = [module.security_group_redis.security_group_id]
  engine                        = "redis"
  engine_version                = "7.0"
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
}

module "security_group_redis" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.1"

  name        = "protecliter-redis-sg-${var.environment}"
  description = "Security group for Redis"
  vpc_id      = module.vpc.vpc_id

  ingress_with_cidr_blocks = [
    {
      from_port   = 6379
      to_port     = 6379
      protocol    = "tcp"
      description = "Redis access from within VPC"
      cidr_blocks = module.vpc.vpc_cidr_block
    },
  ]
}
