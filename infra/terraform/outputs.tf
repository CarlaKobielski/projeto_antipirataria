output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "The connection endpoint for the RDS database"
  value       = module.db.db_instance_endpoint
}

output "redis_endpoint" {
  description = "The endpoint for the Redis cluster"
  value       = aws_elasticache_replication_group.default.primary_endpoint_address
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket for evidence"
  value       = module.s3_bucket.s3_bucket_id
}
