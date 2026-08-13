-- DropIndex
DROP INDEX "issue_status_history_to_status_created_at_idx";

-- DropIndex
DROP INDEX "issues_location_gist";

-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "category_department_rules" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "citizen_verifications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "escalations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "issue_categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "issue_media" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "issue_reports" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "issue_status_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "issue_supports" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "issues" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notification_preferences" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sla_policies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_order_dependencies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_order_notes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_order_transfers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_orders" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "escalations_work_order_level_key" RENAME TO "escalations_work_order_id_level_key";

-- RenameIndex
ALTER INDEX "notifications_recipient_read_idx" RENAME TO "notifications_recipient_id_read_at_idx";

-- RenameIndex
ALTER INDEX "work_order_dependencies_pair_key" RENAME TO "work_order_dependencies_predecessor_id_successor_id_key";

-- RenameIndex
ALTER INDEX "work_order_dependencies_successor_idx" RENAME TO "work_order_dependencies_successor_id_idx";

-- RenameIndex
ALTER INDEX "work_order_transfers_to_department_status_idx" RENAME TO "work_order_transfers_to_department_id_status_idx";
