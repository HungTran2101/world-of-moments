CREATE TYPE "SubmissionStatus" AS ENUM ('published', 'unpublished');
CREATE TYPE "SubmissionValidity" AS ENUM ('valid', 'invalid', 'need-inspect');
CREATE TYPE "SubmissionSource" AS ENUM ('cms', 'client');

ALTER TABLE "submissions"
  ADD COLUMN "status" "SubmissionStatus" NOT NULL DEFAULT 'published',
  ADD COLUMN "validity" "SubmissionValidity" NOT NULL DEFAULT 'valid',
  ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'client',
  ADD COLUMN "createdFrom" "SubmissionSource" NOT NULL DEFAULT 'client',
  ADD COLUMN "updatedBy" TEXT;

-- Giữ các bài cũ hợp lệ; chỉ bài tạo sau migration mới cần kiểm tra.
ALTER TABLE "submissions" ALTER COLUMN "validity" SET DEFAULT 'need-inspect';
ALTER TABLE "cms_auth_users" ADD COLUMN "updatedBy" TEXT;
ALTER TABLE "cms_roles" ADD COLUMN "updatedBy" TEXT;
