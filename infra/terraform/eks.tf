module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.2.0"

  cluster_name    = "protecliter-${var.environment}"
  cluster_version = "1.29"

  cluster_endpoint_public_access  = true

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  # EKS Addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  eks_managed_node_groups = {
    general = {
      min_size     = 1
      max_size     = 3
      desired_size = 2

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
    
    # Dedicated node group for crawler workers (optional cost optimization)
    # crawler = {
    #   min_size     = 1
    #   max_size     = 5
    #   desired_size = 1
    #   instance_types = ["t3.small"]
    #   capacity_type  = "SPOT"
    #   labels = {
    #     role = "crawler"
    #   }
    #   taints = {
    #     dedicated = {
    #       key    = "role"
    #       value  = "crawler"
    #       effect = "NO_SCHEDULE"
    #     }
    #   }
    # }
  }

  # Cluster access entry
  enable_cluster_creator_admin_permissions = true
}

# IRSA for S3 Access (Evidence Bucket)
module "s3_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.34.0"

  role_name = "protecliter-s3-access-${var.environment}"

  attach_vpce_policy = true
  vpce_policy_arn    = "arn:aws:iam::aws:policy/AmazonS3FullAccess" # Restrict this in production!

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["default:crawler-service", "default:detection-service"]
    }
  }
}
