module "db" {
  source = "terraform-aws-modules/rds/aws"
  version = "6.4.0"

  identifier = "protecliter-db-${var.environment}"

  engine               = "postgres"
  engine_version       = "15.5"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = "db.t3.medium"

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = "protecliter_prod"
  username = "protecliter"
  port     = 5432

  multi_az               = false # Set to true for production high availability
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.security_group_db.security_group_id]

  maintenance_window              = "Mon:00:00-Mon:03:00"
  backup_window                   = "03:00-06:00"
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  create_cloudwatch_log_group     = true

  backup_retention_period = 7
  skip_final_snapshot     = true
  deletion_protection     = false # Set to true for production

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
}

module "security_group_db" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.1"

  name        = "protecliter-db-sg-${var.environment}"
  description = "Security group for RDS database"
  vpc_id      = module.vpc.vpc_id

  # Ingress allowed from EKS nodes
  ingress_with_cidr_blocks = [
    {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      description = "PostgreSQL access from within VPC"
      cidr_blocks = module.vpc.vpc_cidr_block
    },
  ]
}
