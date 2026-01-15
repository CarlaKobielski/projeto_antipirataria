module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "protecliter-vpc-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
  elasticache_subnets = ["10.0.31.0/24", "10.0.32.0/24", "10.0.33.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true # Save costs for MVP, use false for high availability
  enable_vpn_gateway = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  create_database_subnet_group = true
  create_elasticache_subnet_group = true

  tags = {
    "kubernetes.io/cluster/protecliter-${var.environment}" = "shared"
  }

  public_subnet_tags = {
    "kubernetes.io/cluster/protecliter-${var.environment}" = "shared"
    "kubernetes.io/role/elb"                      = 1
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/protecliter-${var.environment}" = "shared"
    "kubernetes.io/role/internal-elb"             = 1
  }
}
