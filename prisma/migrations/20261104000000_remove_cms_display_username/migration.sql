-- Chỉ dùng username đã chuẩn hóa và name để hiển thị; bỏ bản sao username không được đọc.
ALTER TABLE "cms_auth_users" DROP COLUMN "displayUsername";
