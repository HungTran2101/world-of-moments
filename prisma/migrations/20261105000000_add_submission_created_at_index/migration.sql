-- Hỗ trợ lọc theo thời gian tạo và tìm mốc lịch sử sớm nhất trên Dashboard.
CREATE INDEX "submissions_created_at_idx" ON "submissions"("created_at");
