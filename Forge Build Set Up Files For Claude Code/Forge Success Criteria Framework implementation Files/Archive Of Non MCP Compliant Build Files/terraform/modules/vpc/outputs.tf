/**
 * FORGE Infrastructure - VPC Module Outputs
 * @epic 09 - Cloud Deployment
 */

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = aws_subnet.database[*].id
}

output "database_subnet_group_name" {
  description = "Database subnet group name"
  value       = aws_db_subnet_group.main.name
}

output "elasticache_subnet_group_name" {
  description = "ElastiCache subnet group name"
  value       = aws_elasticache_subnet_group.main.name
}

output "nat_gateway_ips" {
  description = "NAT Gateway IPs"
  value       = aws_eip.nat[*].public_ip
}

output "availability_zones" {
  description = "Availability zones"
  value       = slice(data.aws_availability_zones.available.names, 0, var.az_count)
}
